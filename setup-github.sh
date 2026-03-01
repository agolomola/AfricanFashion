#!/bin/bash

# GitHub Repository Setup Script for African Fashion Platform
# This script initializes a git repository and pushes to GitHub

set -e

echo "🚀 Setting up GitHub repository for African Fashion Platform..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: African Fashion Marketplace Platform

- Full-stack eCommerce platform with 5 user types
- 3D Virtual Try-On feature with avatar generation
- Stripe payment integration
- Order splitting across Admin, Fabric Seller, and Designer
- Location-based fabric-designer matching
- Dynamic pricing rules system
- Role-based access control
- Complete dashboard for each user type

Tech Stack:
- Backend: Node.js, Express, TypeScript, PostgreSQL, Prisma
- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand
- 3D: React Three Fiber, Three.js
- Payments: Stripe"

# Instructions for GitHub
echo ""
echo "✅ Local repository setup complete!"
echo ""
echo "To push to GitHub, follow these steps:"
echo ""
echo "1. Create a new repository on GitHub:"
echo "   https://github.com/new"
echo ""
echo "2. Run the following commands:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Or use GitHub CLI:"
echo "   gh repo create YOUR_REPO_NAME --public --source=. --push"
echo ""

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "📝 GitHub CLI detected! Would you like to create and push to a new repository now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Enter repository name (default: african-fashion-marketplace):"
        read -r repo_name
        repo_name=${repo_name:-african-fashion-marketplace}
        
        echo "Enter repository description:"
        read -r repo_desc
        
        echo "Creating GitHub repository..."
        gh repo create "$repo_name" --public --description "$repo_desc" --source=. --push
        
        echo "✅ Repository created and code pushed successfully!"
        echo "🌐 View your repository at: https://github.com/$GITHUB_USER/$repo_name"
    fi
else
    echo "💡 Tip: Install GitHub CLI for easier repository management:"
    echo "   https://cli.github.com/"
fi

echo ""
echo "🎉 Setup complete!"
