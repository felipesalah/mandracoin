import sha256 from 'sha256';
import { v1 } from 'uuid';

class Blockchain {
    chain = [];
    pendingTransactions = [];
    currentNodeUrl;
    networkNodes = [];
    nonce;
    previousBlockHash;
    hash;

    constructor(nonce, previousBlockHash, hash, currentNodeUrl) {
        this.nonce = nonce;
        this.previousBlockHash = previousBlockHash;
        this.hash = hash;
        this.currentNodeUrl = currentNodeUrl;
        // GENESIS BLOCK
        this.createNewBlock(nonce, previousBlockHash, hash);
    }

    createNewBlock = (nonce, previousBlockHash, hash) => {
        const newBlock = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            nonce,
            hash,
            previousBlockHash
        };
    
        this.pendingTransactions = [];
        this.chain.push(newBlock);
    
        return newBlock;
    }

    getLastBlock = () => {
        return this.chain[this.chain.length - 1];
    }
    
    createNewTransaction = (amount, sender, recipient) => {
        const newTransaction = { 
            amount, 
            sender, 
            recipient,
            transactionId: v1().split('-').join('')
        };
    
        return newTransaction;
    }

    addTransactionToPending = transaction => {
        this.pendingTransactions.push(transaction);

        return this.getLastBlock().index + 1;
    }
    
    hashBlock = (previousBlockHash, currentBlockData, nonce) => {
        const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash = sha256(dataAsString);
    
        return hash;
    }
    
    proofOfWork = (previousBlockHash, currentBlockData) => {
        let nonce = 0;
        let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        while (hash.substring(0, 4) !== '0000') {
            nonce++;
            hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
            // console.log(hash);
        }
    
        return nonce;
    }

    validateChain = chain => {
        let isValid = true;
        chain.map((currentBlock, index) => {
            const isGenesisBlock = index === 0;
            if (isGenesisBlock) {
                const correctNonce = currentBlock.nonce === this.nonce;
                const correctPreviousBlockHash = currentBlock.previousBlockHash === this.previousBlockHash;
                const correctHash = currentBlock.hash === this.hash;
                const correctTransactions = currentBlock.transactions.length === 0;
                if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) isValid = false;
            } else {
                const previousBlock = chain[index - 1];
                const currentBlockData = { transactions: currentBlock.transactions, index: currentBlock.index };
                const currentBlockHash = this.hashBlock(previousBlock.hash, currentBlockData, currentBlock.nonce);
                if (currentBlockHash.substr(0, 4) !== '0000') isValid = false;
                if (currentBlock.previousBlockHash !== previousBlock.hash) isValid = false;
            }
        })

        return isValid;
    }

}

export default Blockchain;
