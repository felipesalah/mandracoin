import express from 'express';
import bodyParser from 'body-parser';
import { v1 } from 'uuid';
import Blockchain from './blockchain';
import HttpService from './httpService';

const mandracoin = new Blockchain(777, 'MANDRA', 'COIN');
const nodeAddress = v1().split('-').join('');
const api = express();
const port = process.argv[2];

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
    const nonce = mandracoin.proofOfWork(previousBlockHash, currentBlockData);
    const hash = mandracoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    mandracoin.createNewTransaction(12.5, '00', nodeAddress);

    const newBlock = mandracoin.createNewBlock(nonce, previousBlockHash, hash);

    res.json({
        message: 'Block mined successfully!',
        block: newBlock
    });
});

api.post('/blockchain/register-and-broadcast-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const registerNodePromises = [];
    if (!mandracoin.networkNodes.includes(newNodeUrl)) mandracoin.networkNodes.push(newNodeUrl);

    mandracoin.networkNodes.map(nodeUrl => {
        const request = new HttpService(nodeUrl);
        registerNodePromises.push(request.post('/blockchain/register-node', { newNodeUrl }));
    });

    Promise.all(registerNodePromises)
        .then(() => {
            const request = new HttpService(newNodeUrl);
            return request.post('/blockchain/register-nodes-bulk', { 
                allNetworkNodes: [ ...mandracoin.networkNodes, mandracoin.currentNodeUrl ] 
            });
        })
        .then(() => {
            res.json({ message: 'New node has been registered on the network!' })
        });
});

api.post('/blockchain/register-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const dontExist = !mandracoin.networkNodes.includes(newNodeUrl);
    const notTheSame = mandracoin.currentNodeUrl !== newNodeUrl;
    if (dontExist && notTheSame) mandracoin.networkNodes.push(newNodeUrl);

    res.json({ message: 'New node has been registered!' })
});

api.post('/blockchain/register-nodes-bulk', (req, res) => {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.map(nodeUrl => {
        const dontExist = !mandracoin.networkNodes.includes(nodeUrl);
        const notTheSame = mandracoin.currentNodeUrl !== nodeUrl;
        if (dontExist && notTheSame) mandracoin.networkNodes.push(nodeUrl);
    });

    res.json({ message: 'Bulk has been registered!' })
});

api.listen(port, () => {
    console.log(`Listening on port ${port}...`)
});