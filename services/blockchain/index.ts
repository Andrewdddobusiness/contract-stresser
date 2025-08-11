// Clients
export {
  createPublicClientForChain,
  createWalletClientForChain,
  createTestClientForChain,
  createWebSocketClient,
  createBlockchainClients,
  getDefaultLocalAccount,
  checkConnection,
  getNetworkInfo,
} from './clients'

// Chains
export {
  anvil,
  sepolia,
  supportedChains,
  getChainById,
  isLocalChain,
  isTestnet,
  getChainFeatures,
  getTransactionUrl,
  getAddressUrl,
  getBlockUrl,
  networkDisplayConfig,
  type ChainWithFeatures,
} from './chains'

// Connection Management
export {
  ConnectionProvider,
  useConnection,
  useCurrentChain,
  useNetworkInfo,
  useChainFeatures,
  useIsLocalChain,
  type ConnectionState,
  type NetworkInfo,
} from './connection'

// WebSocket
export {
  WebSocketManager,
  wsManager,
  useWebSocket,
  useBlockListener,
  useTransactionListener,
  useContractLogs,
} from './websocket'

// Blocks
export {
  blocksService,
  useRecentBlocks,
  useBlockDetails,
  useTransactionDetails,
  useBlockSearch,
  useRealtimeBlocks,
  useLatestBlockNumber,
  type BlockWithTransactions,
  type TransactionWithLogs,
} from './blocks'

// Network Monitoring
export {
  networkMonitorService,
  type NetworkStatus,
  type NetworkAlert,
  type NetworkHealth,
  type GasPriceHistory,
} from './networkMonitor'

// Custom RPC
export {
  customRpcService,
  type CustomRpcConfig,
  type CustomRpcConnection,
} from './customRpc'