import express from 'express';
import bodyParser from 'body-parser';
import { v1 } from 'uuid';
import Blockchain from '../blockchain';
import HttpService from '../http';
import ROUTES from './routes';

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

        this.api.get(ROUTES.getBlockchain, this.getBlockchain);
        this.api.post(ROUTES.createTransaction, this.createTransaction);
        this.api.post(ROUTES.broadcastTransaction, this.broadcastTransaction);
        this.api.get(ROUTES.mine, this.mine);
        this.api.post(ROUTES.receiveBlock, this.receiveBlock);
        this.api.post(ROUTES.broadcastNode, this.broadcastNode);
        this.api.post(ROUTES.registerNode, this.registerNode);
        this.api.post(ROUTES.registerNodesBulk, this.registerNodesBulk);
        this.api.get(ROUTES.consensus, this.consensus);
        
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
            registerTransactionsPromises.push(request.post(ROUTES.createTransaction, newTransaction));
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
            registerBlockPromises.push(request.post(ROUTES.receiveBlock, { newBlock }));
        });

        Promise.all(registerBlockPromises)
            .then(() => {
                const request = new HttpService(this.mandracoin.currentNodeUrl);
                return request.post(ROUTES.broadcastTransaction, { 
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
            registerNodePromises.push(request.post(ROUTES.registerNode, { newNodeUrl }));
        });

        Promise.all(registerNodePromises)
            .then(() => {
                const request = new HttpService(newNodeUrl);
                return request.post(ROUTES.registerNodesBulk, { 
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

    consensus = (req, res) => {
        const blockchainPromises = [];
        this.mandracoin.networkNodes.map(nodeUrl => {
            const request = new HttpService(nodeUrl);
            blockchainPromises.push(request.get(ROUTES.getBlockchain))
        });

        Promise.all(blockchainPromises)
            .then(blockchains => {
                const currentChainLength = this.mandracoin.chain.length;
                let maxChainLength = currentChainLength;
                let longestChain = null;
                let pendingTransactions = null;
                blockchains.map(blockchain => {
                    if (blockchain.chain.length > maxChainLength) {
                        maxChainLength = blockchain.chain.length;
                        longestChain = blockchain.chain;
                        pendingTransactions = blockchain.pendingTransactions;
                    }
                });

                const notValidChain = !longestChain || (longestChain && !this.mandracoin.validateChain(longestChain));
                if (notValidChain) {
                    res.json({ message: 'The Chain has not been replaced.' , chain: this.mandracoin.chain });
                } else {
                    this.mandracoin.chain = longestChain;
                    this.mandracoin.pendingTransactions = pendingTransactions;
                    res.json({ message: 'The Chain has been replaced.' , chain: this.mandracoin.chain });
                }
            })
    }

}

export default NetworkNode;
