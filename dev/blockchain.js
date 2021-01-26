import sha256 from 'sha256';

class Blockchain {
    chain = [];
    pendingTransactions = [];

    constructor() {
        // GENESIS BLOCK
        this.createNewBlock(777, 'MANDRA', 'COIN');
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
        const newTransaction = { amount, sender, recipient };
        this.pendingTransactions.push(newTransaction);
    
        return getLastBlock().index + 1;
    }
    
    hashBlock = (previousBlockHash, currentBlockData, nonce) => {
        const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash = sha256(dataAsString);
    
        return hash;
    }
    
    proofOfWork = (previousBlockHash, currentBlockData) => {
        let nonce = 0;
        let hash = hashBlock(previousBlockHash, currentBlockData, nonce);
        while (hash.substring(0, 4) !== '0000') {
            nonce++;
            hash = hashBlock(previousBlockHash, currentBlockData, nonce);
            // console.log(hash);
        }
    
        return nonce;
    }

}

export default Blockchain;
