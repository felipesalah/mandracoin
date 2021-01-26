import express from 'express';
import bodyParser from 'body-parser';
import { v1 } from 'uuid';
import Blockchain from './blockchain';

const mandracoin = new Blockchain;
const nodeAddress = v1().split('-').join('');
const api = express();

api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: false }));

api.get('/blockchain', (req, res) => {
    res.send(mandracoin);
});

api.post('/blockchain/transaction', (req, res) => {
    const blockIndex = mandracoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    res.json({ message: `Transaction added in blocK: ${blockIndex}` });
});

api.get('/blockchain/mine', (req, res) => {
    const lastBlock = mandracoin.getLastBlock();
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
        transactions: mandracoin.pendingTransactions,
        index: lastBlock.index + 1
    };
    const nonce = proofOfWork(previousBlockHash, currentBlockData);
    const hash = hashBlock(previousBlockHash, currentBlockData, nonce);

    mandracoin.createNewTransaction(12.5, '00', nodeAddress);

    const newBlock = mandracoin.createNewBlock(nonce, previousBlockHash, hash);

    res.json({
        message: 'Block mined successfully!',
        block: newBlock
    });
});

api.listen(3000, () => {
    console.log('Listening on port 3000...')
});