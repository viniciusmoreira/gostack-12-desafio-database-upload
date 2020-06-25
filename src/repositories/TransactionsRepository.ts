import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const balance = transactions.reduce(
      (accumulator, transaction) => {
        const typeValue = accumulator[transaction.type] || 0;

        return {
          ...accumulator,
          [transaction.type]: typeValue + transaction.value,
        };
      },
      { income: 0, outcome: 0 },
    );

    return { ...balance, total: balance.income - balance.outcome };
  }
}

export default TransactionsRepository;
