#!/bin/bash

# Signal9 Advisor - Secret Population Script
# This script populates the AWS Secrets Manager with initial API credentials
# for AlphaVantage and Alpaca APIs

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SECRET_NAME="signal9-advisor/api-credentials"
AWS_REGION=${AWS_REGION:-us-east-1}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script populates AWS Secrets Manager with API credentials for Signal9 Advisor."
    echo ""
    echo "Options:"
    echo "  -h, --help               Show this help message"
    echo "  -s, --secret-name NAME   Secret name (default: signal9-advisor/api-credentials)"
    echo "  -r, --region REGION      AWS region (default: us-east-1)"
    echo "  --dry-run                Show what would be done without making changes"
    echo ""
    echo "Required Environment Variables:"
    echo "  ALPHAVANTAGE_API_KEY    AlphaVantage API key from alphavantage.co"
    echo "  ALPACA_API_KEY          Alpaca API key from alpaca.markets"
    echo "  ALPACA_API_SECRET       Alpaca API secret from alpaca.markets"
    echo ""
    echo "Example:"
    echo "  export ALPHAVANTAGE_API_KEY='your-alphavantage-key'"
    echo "  export ALPACA_API_KEY='your-alpaca-key'"
    echo "  export ALPACA_API_SECRET='your-alpaca-secret'"
    echo "  $0"
    echo ""
    echo "Or use inline environment variables:"
    echo "  ALPHAVANTAGE_API_KEY='key1' ALPACA_API_KEY='key2' ALPACA_API_SECRET='secret' $0"
}

# Function to validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or invalid. Please run 'aws configure'"
        exit 1
    fi
    
    # Check if jq is installed (for JSON processing)
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Installing jq for JSON processing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command -v yum &> /dev/null; then
            sudo yum install -y jq
        elif command -v brew &> /dev/null; then
            brew install jq
        else
            print_error "Cannot install jq automatically. Please install jq manually"
            exit 1
        fi
    fi
    
    print_success "Prerequisites validated"
}

# Function to validate environment variables
validate_environment_variables() {
    print_status "Validating environment variables..."
    
    local errors=0
    
    # Check if required environment variables are set
    if [[ -z "$ALPHAVANTAGE_API_KEY" ]]; then
        print_error "ALPHAVANTAGE_API_KEY environment variable is not set"
        errors=$((errors + 1))
    elif [[ ${#ALPHAVANTAGE_API_KEY} -lt 8 ]]; then
        print_error "ALPHAVANTAGE_API_KEY appears to be too short (minimum 8 characters)"
        errors=$((errors + 1))
    fi
    
    if [[ -z "$ALPACA_API_KEY" ]]; then
        print_error "ALPACA_API_KEY environment variable is not set"
        errors=$((errors + 1))
    elif [[ ${#ALPACA_API_KEY} -lt 16 ]]; then
        print_error "ALPACA_API_KEY appears to be too short (minimum 16 characters)"
        errors=$((errors + 1))
    fi
    
    if [[ -z "$ALPACA_API_SECRET" ]]; then
        print_error "ALPACA_API_SECRET environment variable is not set"
        errors=$((errors + 1))
    elif [[ ${#ALPACA_API_SECRET} -lt 16 ]]; then
        print_error "ALPACA_API_SECRET appears to be too short (minimum 16 characters)"
        errors=$((errors + 1))
    fi
    
    if [[ $errors -gt 0 ]]; then
        print_error "$errors validation errors found. Please set the required environment variables."
        show_usage
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Function to check if secret exists
check_secret_exists() {
    local secret_name=$1
    
    print_status "Checking if secret '$secret_name' exists..."
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &> /dev/null; then
        print_success "Secret '$secret_name' exists"
        return 0
    else
        print_warning "Secret '$secret_name' does not exist"
        return 1
    fi
}

# Function to create secret JSON
create_secret_json() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Create secret JSON using jq to ensure proper escaping
    SECRET_VALUE=$(jq -n \
        --arg av_key "$ALPHAVANTAGE_API_KEY" \
        --arg alpaca_key "$ALPACA_API_KEY" \
        --arg alpaca_secret "$ALPACA_API_SECRET" \
        --arg updated "$timestamp" \
        '{
            alphaVantageApiKey: $av_key,
            alpacaApiKey: $alpaca_key,
            alpacaApiSecret: $alpaca_secret,
            lastUpdated: $updated
        }')
    
    print_status "Secret JSON created with timestamp: $timestamp"
}

# Function to update or create secret
update_secret() {
    local secret_name=$1
    local dry_run=$2
    
    print_status "Preparing to update secret '$secret_name'..."
    
    if [[ "$dry_run" == "true" ]]; then
        print_warning "DRY RUN: Would update secret with the following structure:"
        echo "$SECRET_VALUE" | jq .
        return 0
    fi
    
    # Try to update the secret first
    if check_secret_exists "$secret_name"; then
        print_status "Updating existing secret..."
        
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$SECRET_VALUE" \
            --description "External API credentials for Signal9 Advisor - Updated $(date)" \
            --region "$AWS_REGION" > /dev/null
            
        print_success "Secret updated successfully"
    else
        print_status "Creating new secret..."
        
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$SECRET_VALUE" \
            --description "External API credentials for Signal9 Advisor - Created $(date)" \
            --region "$AWS_REGION" \
            --tags '[
                {"Key":"Project","Value":"Signal9Advisor"},
                {"Key":"Component","Value":"SecretsManager"},
                {"Key":"Environment","Value":"development"},
                {"Key":"ManagedBy","Value":"Script"}
            ]' > /dev/null
            
        print_success "Secret created successfully"
    fi
}

# Function to verify secret was populated correctly
verify_secret() {
    local secret_name=$1
    
    print_status "Verifying secret was populated correctly..."
    
    # Retrieve the secret
    local retrieved_secret
    retrieved_secret=$(aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" \
        --query 'SecretString' \
        --output text)
    
    # Parse and validate the retrieved secret
    local av_key alpaca_key alpaca_secret
    av_key=$(echo "$retrieved_secret" | jq -r '.alphaVantageApiKey')
    alpaca_key=$(echo "$retrieved_secret" | jq -r '.alpacaApiKey')
    alpaca_secret=$(echo "$retrieved_secret" | jq -r '.alpacaApiSecret')
    
    # Verify the keys match (first and last 4 characters for security)
    local av_masked="${av_key:0:4}...${av_key: -4}"
    local alpaca_key_masked="${alpaca_key:0:4}...${alpaca_key: -4}"
    local alpaca_secret_masked="${alpaca_secret:0:4}...${alpaca_secret: -4}"
    
    print_success "Secret verification completed:"
    echo "  AlphaVantage API Key: $av_masked"
    echo "  Alpaca API Key: $alpaca_key_masked"  
    echo "  Alpaca API Secret: $alpaca_secret_masked"
    
    # Validate that the keys are not empty or null
    if [[ "$av_key" == "null" ]] || [[ -z "$av_key" ]]; then
        print_error "AlphaVantage API key is missing from the secret"
        exit 1
    fi
    
    if [[ "$alpaca_key" == "null" ]] || [[ -z "$alpaca_key" ]]; then
        print_error "Alpaca API key is missing from the secret"
        exit 1
    fi
    
    if [[ "$alpaca_secret" == "null" ]] || [[ -z "$alpaca_secret" ]]; then
        print_error "Alpaca API secret is missing from the secret"
        exit 1
    fi
    
    print_success "All credentials verified successfully"
}

# Main function
main() {
    local dry_run="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -s|--secret-name)
                SECRET_NAME="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo "=========================================="
    echo "Signal9 Advisor - Secret Population Script"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Secret Name: $SECRET_NAME"
    echo "  AWS Region: $AWS_REGION"
    echo "  Dry Run: $dry_run"
    echo ""
    
    # Run the population process
    validate_prerequisites
    validate_environment_variables
    create_secret_json
    update_secret "$SECRET_NAME" "$dry_run"
    
    if [[ "$dry_run" != "true" ]]; then
        verify_secret "$SECRET_NAME"
        
        echo ""
        print_success "Secret population completed successfully!"
        print_status "You can now deploy your Lambda functions that use these credentials"
        print_status "The SecretsHelper utility will be able to retrieve these credentials"
        
        echo ""
        print_status "Next steps:"
        echo "  1. Deploy your CDK stack: npm run deploy"
        echo "  2. Test Lambda functions that use the SecretsHelper"
        echo "  3. Monitor CloudWatch logs for any access issues"
    else
        echo ""
        print_success "Dry run completed successfully!"
        print_status "Remove --dry-run flag to actually populate the secret"
    fi
    
    echo ""
    echo "=========================================="
}

# Run the main function
main "$@" 