import express from 'express';
import bodyParser from 'body-parser';
import { v1 } from 'uuid';
import Blockchain from '../blockchain';
import HttpService from '../http';

class NetworkNode {
    mandracoin;
    nodeAddress;
    api;
    port;

    constructor(port, nodeUrl) {
        this.mandracoin = new Blockchain(777, 'MANDRA', 'COIN', nodeUrl);
        this.nodeAddress = v1().split('-').join('');
        this.api = express();
        this.port = port;
    }

    start = () => {
        this.api.use(bodyParser.json());
        this.api.use(bodyParser.urlencoded({ extended: false }));

        this.api.get('/blockchain', this.getBlockchain);
        this.api.post('/blockchain/transaction', this.createTransaction);
        this.api.post('/blockchain/transaction/broadcast', this.broadcastTransaction);
        this.api.get('/blockchain/block/mine', this.mine);
        this.api.post('/blockchain/block/receive', this.receiveBlock);
        this.api.post('/blockchain/network-node/broadcast', this.broadcastNode);
        this.api.post('/blockchain/network-node/register', this.registerNode);
        this.api.post('/blockchain/network-node/register-bulk', this.registerNodesBulk);
        
        this.api.listen(this.port, () => {
            console.log(`Listening on port ${this.port}...`)
        });
    }

    getBlockchain = (req, res) => {
        res.send(this.mandracoin);
    }

    createTransaction = (req, res) => {
        const newTransaction = req.body;
        const blockIndex = this.mandracoin.addTransactionToPending(newTransaction);

        res.json({ message: `Transaction will be added in block: ${blockIndex}` });
    }

    broadcastTransaction = (req, res) => {
        const newTransaction = this.mandracoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
        const registerTransactionsPromises = [];
        this.mandracoin.addTransactionToPending(newTransaction);

        this.mandracoin.networkNodes.map(nodeUrl => {
            const request = new HttpService(nodeUrl);
            registerTransactionsPromises.push(request.post('/blockchain/transaction', newTransaction));
        });

        Promise.all(registerTransactionsPromises)
            .then(() => {
                res.json({ message: 'New transaction has been created and broadcasted!' });
            });
    }

    mine = (req, res) => {
        const lastBlock = this.mandracoin.getLastBlock();
        const previousBlockHash = lastBlock.hash;
        const currentBlockData = {
            transactions: this.mandracoin.pendingTransactions,
            index: lastBlock.index + 1
        };
        const nonce = this.mandracoin.proofOfWork(previousBlockHash, currentBlockData);
        const hash = this.mandracoin.hashBlock(previousBlockHash, currentBlockData, nonce);
        const registerBlockPromises = [];
        const newBlock = this.mandracoin.createNewBlock(nonce, previousBlockHash, hash);

        this.mandracoin.networkNodes.map(nodeUrl => {
            const request = new HttpService(nodeUrl);
            registerBlockPromises.push(request.post('/blockchain/block/receive', { newBlock }));
        });

        Promise.all(registerBlockPromises)
            .then(() => {
                const request = new HttpService(this.mandracoin.currentNodeUrl);
                return request.post('/blockchain/transaction/broadcast', { 
                    amount: 12.5, sender: "00", recipient: this.nodeAddress
                });
            })
            .then(() => {
                res.json({
                    message: 'New Block has been mined and broadcasted!',
                    block: newBlock
                });
            });
    }

    receiveBlock = (req, res) => {
        const newBlock = req.body.newBlock;
        const lastBlock = this.mandracoin.getLastBlock();
        const isValidHash = lastBlock.hash === newBlock.previousBlockHash;
        const isValidIndex = lastBlock.index + 1 === newBlock.index;

        if (isValidHash && isValidIndex) {
            this.mandracoin.chain.push(newBlock);
            this.mandracoin.pendingTransactions = [];

            res.json({ message: 'A new Block has been received!', newBlock });
        } else {
            res.json({ message: 'The block has been rejected.', newBlock });
        }
    }

    broadcastNode = (req, res) => {
        const newNodeUrl = req.body.newNodeUrl;
        const registerNodePromises = [];
        if (!this.mandracoin.networkNodes.includes(newNodeUrl)) this.mandracoin.networkNodes.push(newNodeUrl);

        this.mandracoin.networkNodes.map(nodeUrl => {
            const request = new HttpService(nodeUrl);
            registerNodePromises.push(request.post('/blockchain/network-node/register', { newNodeUrl }));
        });

        Promise.all(registerNodePromises)
            .then(() => {
                const request = new HttpService(newNodeUrl);
                return request.post('/blockchain/network-node/register-bulk', { 
                    allNetworkNodes: [ ...this.mandracoin.networkNodes, this.mandracoin.currentNodeUrl ] 
                });
            })
            .then(() => {
                res.json({ message: 'New node has been registered on the network!' })
            });
    }

    registerNode = (req, res) => {
        const newNodeUrl = req.body.newNodeUrl;
        const dontExist = !this.mandracoin.networkNodes.includes(newNodeUrl);
        const notTheSame = this.mandracoin.currentNodeUrl !== newNodeUrl;
        if (dontExist && notTheSame) this.mandracoin.networkNodes.push(newNodeUrl);

        res.json({ message: 'New node has been registered!' });
    }

    registerNodesBulk = (req, res) => {
        const allNetworkNodes = req.body.allNetworkNodes;
        allNetworkNodes.map(nodeUrl => {
            const dontExist = !this.mandracoin.networkNodes.includes(nodeUrl);
            const notTheSame = this.mandracoin.currentNodeUrl !== nodeUrl;
            if (dontExist && notTheSame) this.mandracoin.networkNodes.push(nodeUrl);
        });

        res.json({ message: 'Bulk has been registered!' });
    }

}

export default NetworkNode;
