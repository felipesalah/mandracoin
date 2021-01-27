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
        this.api.get('/blockchain/mine', this.mine);
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
        const blockIndex = this.mandracoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
        res.json({ message: `Transaction added in blocK: ${blockIndex}` });
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

        this.mandracoin.createNewTransaction(12.5, '00', this.nodeAddress);

        const newBlock = this.mandracoin.createNewBlock(nonce, previousBlockHash, hash);

        res.json({
            message: 'Block mined successfully!',
            block: newBlock
        });
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
