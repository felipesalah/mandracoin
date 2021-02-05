const ROUTES = {
    getBlockchain: '/blockchain',
    createTransaction: '/blockchain/transaction',
    broadcastTransaction: '/blockchain/transaction/broadcast',
    mine: '/blockchain/block/mine',
    receiveBlock: '/blockchain/block/receive',
    broadcastNode: '/blockchain/network-node/broadcast',
    registerNode: '/blockchain/network-node/register',
    registerNodesBulk: '/blockchain/network-node/register-bulk',
    consensus: '/blockchain/consensus'
}

export default ROUTES;