#!/bin/bash

# Signal9 Advisor Infrastructure Deployment Script
# This script deploys the CDK infrastructure to AWS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18+"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI"
        exit 1
    fi
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK CLI is not installed. Please install with: npm install -g aws-cdk"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure'"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed, skipping..."
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if npm test; then
        print_success "All tests passed"
    else
        print_error "Tests failed. Please fix the issues before deploying"
        exit 1
    fi
}

# Function to synthesize CDK
synthesize_cdk() {
    print_status "Synthesizing CDK stack..."
    
    if npm run synth; then
        print_success "CDK synthesis completed successfully"
    else
        print_error "CDK synthesis failed"
        exit 1
    fi
}

# Function to bootstrap CDK (if needed)
bootstrap_cdk() {
    print_status "Checking if CDK bootstrap is required..."
    
    # Get current account and region
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region)
    
    if ! aws cloudformation describe-stacks --stack-name "CDKToolkit" --region "$REGION" &> /dev/null; then
        print_warning "CDK bootstrap not found. Bootstrapping CDK..."
        cdk bootstrap aws://$ACCOUNT/$REGION
        print_success "CDK bootstrap completed"
    else
        print_status "CDK bootstrap already exists, skipping..."
    fi
}

# Function to deploy stack
deploy_stack() {
    print_status "Deploying Signal9 Advisor stack..."
    
    # Get environment from command line argument or use default
    ENVIRONMENT=${1:-development}
    print_status "Deploying to environment: $ENVIRONMENT"
    
    # Deploy with environment context
    if cdk deploy --context environment=$ENVIRONMENT --require-approval never; then
        print_success "Stack deployed successfully!"
        
        # Display stack outputs
        print_status "Stack outputs:"
        aws cloudformation describe-stacks \
            --stack-name Signal9AdvisorStack \
            --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
            --output table
    else
        print_error "Stack deployment failed"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy to (default: development)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environments:"
    echo "  development              Development environment"
    echo "  staging                  Staging environment"
    echo "  production               Production environment"
    echo ""
    echo "Examples:"
    echo "  $0                       Deploy to development environment"
    echo "  $0 -e staging            Deploy to staging environment"
    echo "  $0 --environment prod    Deploy to production environment"
}

# Parse command line arguments
ENVIRONMENT="development"

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: development, staging, production"
    exit 1
fi

# Main deployment process
echo "=========================================="
echo "Signal9 Advisor Infrastructure Deployment"
echo "=========================================="
echo ""

check_prerequisites
install_dependencies
run_tests
synthesize_cdk
bootstrap_cdk
deploy_stack "$ENVIRONMENT"

echo ""
echo "=========================================="
print_success "Deployment completed successfully!"
echo "==========================================" 