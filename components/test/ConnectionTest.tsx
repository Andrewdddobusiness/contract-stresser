'use client'

import { useConnection, useNetworkInfo, useCurrentChain } from '@/services/blockchain'

export function ConnectionTest() {
  const { state, switchChain, refreshConnection } = useConnection()
  const networkInfo = useNetworkInfo()
  const currentChain = useCurrentChain()

  return (
    <div className="p-4 border rounded bg-card">
      <h3 className="text-lg font-semibold mb-3">Blockchain Connection Status</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Chain ID:</span> {currentChain}
        </div>
        
        <div>
          <span className="font-medium">Connected:</span>{' '}
          <span className={state.isConnected ? 'text-green-500' : 'text-red-500'}>
            {state.isConnected ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Connecting:</span>{' '}
          <span className={state.isConnecting ? 'text-yellow-500' : 'text-gray-500'}>
            {state.isConnecting ? 'Yes' : 'No'}
          </span>
        </div>
        
        {state.error && (
          <div className="text-red-500">
            <span className="font-medium">Error:</span> {state.error}
          </div>
        )}
        
        {networkInfo && (
          <div>
            <span className="font-medium">Block Number:</span> {networkInfo.blockNumber.toString()}
          </div>
        )}
        
        <div className="pt-2 space-x-2">
          <button 
            onClick={() => switchChain(31337)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            disabled={state.isConnecting}
          >
            Switch to Anvil
          </button>
          
          <button 
            onClick={() => switchChain(11155111)}
            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            disabled={state.isConnecting}
          >
            Switch to Sepolia
          </button>
          
          <button 
            onClick={refreshConnection}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
            disabled={state.isConnecting}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}