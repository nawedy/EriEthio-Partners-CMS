#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ -f "../.env" ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to create a backup and continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mv ../.env "../.env.backup.$(date +%Y%m%d%H%M%S)"
        echo -e "${GREEN}Backup created${NC}"
    else
        echo -e "${RED}Setup cancelled${NC}"
        exit 1
    fi
fi

# Copy example file
cp ../.env.example ../.env

echo -e "${GREEN}Created new .env file from template${NC}"
echo -e "${YELLOW}Please edit .env file and add your actual API keys and configuration${NC}"

# Reminder about security
echo -e "\n${RED}SECURITY REMINDERS:${NC}"
echo "1. Never commit .env file to version control"
echo "2. Regularly rotate API keys"
echo "3. Use different keys for development and production"
echo "4. Keep your .env file secure and limit access"

# Git safety check
if [ -d "../.git" ]; then
    if ! grep -q ".env" ../.gitignore; then
        echo ".env" >> ../.gitignore
        echo "*.env" >> ../.gitignore
        echo -e "${GREEN}Added .env to .gitignore${NC}"
    fi
fi

echo -e "\n${GREEN}Setup complete!${NC}"
