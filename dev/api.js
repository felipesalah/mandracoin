import express from 'express';
import bodyParser from 'body-parser';
import { v1 } from 'uuid';
import { 
    BLOCKCHAIN, 
    createNewTransaction,
    createNewBlock,
    getLastBlock,
    proofOfWork,
    hashBlock
} from './blockchain';

const mandracoin = { ...BLOCKCHAIN };
const nodeAddress = v1().split('-').join('');
const api = express();

// GENESIS BLOCK
createNewBlock(777, 'MANDRA', 'COIN', mandracoin)

api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: false }));

api.get('/blockchain', (req, res) => {
    res.send(mandracoin);
});

api.post('/blockchain/transaction', (req, res) => {
    const blockIndex = createNewTransaction(req.body.amount, req.body.sender, req.body.recipient, mandracoin);
    res.json({ message: `Transaction added in blocK: ${blockIndex}` });
});

api.get('/blockchain/mine', (req, res) => {
    const lastBlock = getLastBlock(mandracoin.chain);
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
        transactions: mandracoin.pendingTransactions,
        index: lastBlock.index + 1
    };
    const nonce = proofOfWork(previousBlockHash, currentBlockData);
    const hash = hashBlock(previousBlockHash, currentBlockData, nonce);

    createNewTransaction(12.5, '00', nodeAddress, mandracoin);

    const newBlock = createNewBlock(nonce, previousBlockHash, hash, mandracoin);

    res.json({
        message: 'Block mined successfully!',
        block: newBlock
    });
});

api.listen(3000, () => {
    console.log('Listening on port 3000...')
});