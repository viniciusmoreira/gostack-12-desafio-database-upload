import csvParse from 'csv-parse';
import { join } from 'path';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  path: string;
  filename: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ path, filename }: Request): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    const csvFilePath = join(path, filename);
    const data = await this.loadCSV(csvFilePath);

    const categories: string[] = [];
    const transactions: CSVTransaction[] = [];
    data.map(line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (categories.indexOf(category) === -1) categories.push(category);
      transactions.push({
        title,
        type: type as 'income' | 'outcome',
        value: Number(value),
        category,
      });
    });

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
      select: ['title'],
    }); // .map(category => category.title);

    const addCategories = categories.filter(
      category =>
        existentCategories.findIndex(
          existCategory => existCategory.title === category,
        ) === -1,
    );

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories: Category[] = [
      ...newCategories,
      ...existentCategories,
    ];

    const createdTransactions = transactionRepository.create(
      transactions.map(createTransaction => ({
        title: createTransaction.title,
        type: createTransaction.type,
        value: createTransaction.value,
        category: finalCategories.find(
          category => category.title === createTransaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    fs.unlinkSync(csvFilePath);

    return createdTransactions;
  }

  private async loadCSV(filePath: string): Promise<string[][]> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines: string[][] = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return lines;
  }
}

export default ImportTransactionsService;
