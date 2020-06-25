import { Router } from 'express';
import multer from 'multer';
import { getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();
const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionsRepository.find({
    select: [
      'id',
      'title',
      'value',
      'type',
      'category',
      'created_at',
      'updated_at',
    ],
    relations: ['category'],
  });

  const balance = await transactionsRepository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, type, value, category } = request.body;
  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({
    title,
    type,
    value,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const deleteTransaction = new DeleteTransactionService();

  await deleteTransaction.execute(id);

  return response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const { filename } = request.file;
    const { directory: path } = uploadConfig;
    const importTransaction = new ImportTransactionsService();

    const transactions = await importTransaction.execute({
      path,
      filename,
    });

    response.json(transactions);
  },
);

export default transactionsRouter;

/*
transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const { filename } = request.file;
    const { directory: path } = uploadConfig;
    const importTransaction = new ImportTransactionsService();
    const createTransaction = new CreateTransactionService();

    const dataTransactions = await importTransaction.execute({
      path,
      filename,
    });
    const transactions = dataTransactions.map(async tr => {
      const [title, type, value, category] = tr;

      const teste = await createTransaction.execute({
        title,
        type,
        value: Number(value),
        category,
      });

      console.log(teste);

      return teste;
    });

    await Promise.all(transactions);

    response.json(transactions);
  },
);

export default transactionsRouter;


*/
