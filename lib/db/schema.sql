-- Contract Stresser Database Schema
-- Multi-Contract Deployment System

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    username VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deployment plans table
CREATE TABLE deployment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    chain_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validating', 'deploying', 'completed', 'failed', 'rolled_back')),
    parameters JSONB NOT NULL, -- Deployment parameters (gas price, confirmations, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract configurations within deployment plans
CREATE TABLE contract_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_plan_id UUID REFERENCES deployment_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('ERC20', 'ERC1155', 'Settlement', 'AccessControl', 'Registry')),
    constructor_args JSONB NOT NULL, -- Constructor arguments array
    post_deploy_actions JSONB NOT NULL DEFAULT '[]', -- Post deployment actions
    metadata JSONB NOT NULL DEFAULT '{}', -- Contract metadata (description, version, etc.)
    order_index INTEGER NOT NULL, -- Order in deployment sequence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract dependencies
CREATE TABLE contract_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contract_configs(id) ON DELETE CASCADE,
    depends_on_id UUID REFERENCES contract_configs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_id, depends_on_id)
);

-- Deployment executions/results
CREATE TABLE deployment_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_plan_id UUID REFERENCES deployment_plans(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    total_gas_used NUMERIC(78, 0) NOT NULL DEFAULT 0, -- bigint as string
    total_cost NUMERIC(78, 0) NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deployed contracts
CREATE TABLE deployed_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES deployment_executions(id) ON DELETE CASCADE,
    contract_config_id UUID REFERENCES contract_configs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    address VARCHAR(42) NOT NULL, -- Contract address
    transaction_hash VARCHAR(66) NOT NULL, -- Deployment transaction hash
    block_number NUMERIC(78, 0) NOT NULL, -- bigint as string
    gas_used NUMERIC(78, 0) NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Failed contract deployments
CREATE TABLE failed_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES deployment_executions(id) ON DELETE CASCADE,
    contract_config_id UUID REFERENCES contract_configs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    gas_used NUMERIC(78, 0), -- Gas used before failure
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rollback operations
CREATE TABLE rollback_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_execution_id UUID REFERENCES deployment_executions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    total_gas_used NUMERIC(78, 0) NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rollback actions performed on individual contracts
CREATE TABLE rollback_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rollback_execution_id UUID REFERENCES rollback_executions(id) ON DELETE CASCADE,
    deployed_contract_id UUID REFERENCES deployed_contracts(id) ON DELETE CASCADE,
    actions JSONB NOT NULL, -- Array of actions performed
    gas_used NUMERIC(78, 0) NOT NULL,
    transaction_hashes JSONB NOT NULL DEFAULT '[]', -- Array of transaction hashes
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rollback errors
CREATE TABLE rollback_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rollback_execution_id UUID REFERENCES rollback_executions(id) ON DELETE CASCADE,
    deployed_contract_id UUID REFERENCES deployed_contracts(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract templates (for built-in and user-created templates)
CREATE TABLE contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for built-in templates
    contract_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    bytecode TEXT NOT NULL,
    abi JSONB NOT NULL,
    constructor_schema JSONB NOT NULL, -- Schema for constructor arguments
    default_post_deploy_actions JSONB NOT NULL DEFAULT '[]',
    gas_estimate NUMERIC(78, 0) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]', -- Array of feature strings
    documentation TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract ecosystems (groups of related deployed contracts)
CREATE TABLE contract_ecosystems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deployment_plan_id UUID REFERENCES deployment_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    chain_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deprecated')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract relationships within ecosystems
CREATE TABLE contract_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ecosystem_id UUID REFERENCES contract_ecosystems(id) ON DELETE CASCADE,
    from_contract_id UUID REFERENCES deployed_contracts(id) ON DELETE CASCADE,
    to_contract_id UUID REFERENCES deployed_contracts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('depends_on', 'calls', 'owns', 'manages')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_contract_id, to_contract_id, relationship_type)
);

-- Analytics and metrics
CREATE TABLE deployment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_execution_id UUID REFERENCES deployment_executions(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'gas_usage', 'duration', 'success_rate', etc.
    metric_value NUMERIC(20, 6) NOT NULL,
    metric_unit VARCHAR(20), -- 'wei', 'ms', 'percent', etc.
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_deployment_plans_user_id ON deployment_plans(user_id);
CREATE INDEX idx_deployment_plans_status ON deployment_plans(status);
CREATE INDEX idx_deployment_plans_chain_id ON deployment_plans(chain_id);
CREATE INDEX idx_contract_configs_plan_id ON contract_configs(deployment_plan_id);
CREATE INDEX idx_contract_configs_type ON contract_configs(contract_type);
CREATE INDEX idx_deployed_contracts_execution_id ON deployed_contracts(execution_id);
CREATE INDEX idx_deployed_contracts_address ON deployed_contracts(address);
CREATE INDEX idx_deployed_contracts_type ON deployed_contracts(contract_type);
CREATE INDEX idx_contract_ecosystems_user_id ON contract_ecosystems(user_id);
CREATE INDEX idx_contract_relationships_ecosystem_id ON contract_relationships(ecosystem_id);
CREATE INDEX idx_deployment_metrics_execution_id ON deployment_metrics(deployment_execution_id);
CREATE INDEX idx_deployment_metrics_type ON deployment_metrics(metric_type);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deployment_plans_updated_at 
    BEFORE UPDATE ON deployment_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_ecosystems_updated_at 
    BEFORE UPDATE ON contract_ecosystems 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at 
    BEFORE UPDATE ON contract_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW deployment_plan_summary AS
SELECT 
    dp.id,
    dp.name,
    dp.description,
    dp.status,
    dp.chain_id,
    u.address as user_address,
    COUNT(cc.id) as contract_count,
    COUNT(de.id) as execution_count,
    dp.created_at,
    dp.updated_at
FROM deployment_plans dp
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN contract_configs cc ON dp.id = cc.deployment_plan_id
LEFT JOIN deployment_executions de ON dp.id = de.deployment_plan_id
GROUP BY dp.id, u.address;

CREATE VIEW ecosystem_summary AS
SELECT 
    ce.id,
    ce.name,
    ce.description,
    ce.status,
    ce.chain_id,
    u.address as user_address,
    COUNT(dc.id) as contract_count,
    COUNT(DISTINCT dc.contract_type) as contract_types,
    SUM(dc.gas_used) as total_gas_used,
    ce.created_at,
    ce.updated_at
FROM contract_ecosystems ce
LEFT JOIN users u ON ce.user_id = u.id
LEFT JOIN deployment_plans dp ON ce.deployment_plan_id = dp.id
LEFT JOIN deployment_executions de ON dp.id = de.deployment_plan_id
LEFT JOIN deployed_contracts dc ON de.id = dc.execution_id
GROUP BY ce.id, u.address;