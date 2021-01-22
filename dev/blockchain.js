import sha256 from 'sha256';

export const BLOCKCHAIN = () => {
    const chain = [];
    const pendingTransactions = [];
    // GENESIS BLOCK
    createNewBlock(777, 'MANDRA', 'COIN', { chain, pendingTransactions })

    return { chain, pendingTransactions };
}

export const createNewBlock = (nonce, previousBlockHash, hash, target) => {
    const newBlock = {
        index: target.chain.length + 1,
        timestamp: Date.now(),
        transactions: target.pendingTransactions,
        nonce,
        hash,
        previousBlockHash
    };

    target.pendingTransactions = [];
    target.chain.push(newBlock);

    return newBlock;
}

export const getLastBlock = chain => {
    return chain[chain.length - 1];
}

export const creatNewTransaction = (amount, sender, recipient, target) => {
    const newTransaction = { amount, sender, recipient };
    target.pendingTransactions.push(newTransaction);

    return getLastBlock(target.chain).index + 1;
}

export const hashBlock = (previousBlockHash, currentBlockData, nonce) => {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);

    return hash;
}

export const proofOfWork = (previousBlockHash, currentBlockData) => {
    let nonce = 0;
    let hash = hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = hashBlock(previousBlockHash, currentBlockData, nonce);
        console.log(hash);
    }

    return nonce;
}