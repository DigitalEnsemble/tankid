#!/bin/bash
cd /Users/charlesroehrig/tankid/intake-agent

# Load local dev environment
source .env.doppler

# Use Doppler to get production secrets and run intake agent
echo "Starting TankID Intake Agent with Doppler secrets..."
doppler run --project tankid --config prd -- \
  python3 intake_agent.py \
  --inbox "$INTAKE_INBOX_PATH" \
  --review-server \
  --review-host 0.0.0.0