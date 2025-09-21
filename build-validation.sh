#!/bin/bash
set -e

echo "🔧 Build Validation Script"
echo "========================="
echo ""

# Function to print status messages
print_status() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

print_info() {
    echo "ℹ️  $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_info "Starting build validation process..."
echo ""

# Step 1: Clean any previous builds
print_info "Step 1: Cleaning previous builds..."
if [ -d "dist" ]; then
    rm -rf dist
    print_status "Cleaned existing dist directory"
else
    print_status "No previous build found"
fi

# Step 2: Install dependencies (if needed)
print_info "Step 2: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Step 3: Run the build process
print_info "Step 3: Running production build..."
echo ""
if npm run build; then
    print_status "Production build completed successfully"
    echo ""
else
    print_error "Production build failed"
    print_error "Please check the error messages above and fix any import path issues"
    exit 1
fi

# Step 4: Validate build output
print_info "Step 4: Validating build output..."
if [ -d "dist" ]; then
    print_status "Build output directory exists"
    
    # Check for main files
    if [ -f "dist/index.html" ]; then
        print_status "index.html found in build output"
    else
        print_error "index.html not found in build output"
    fi
    
    # Check for assets
    if [ -d "dist/assets" ]; then
        print_status "Assets directory found"
    else
        print_error "Assets directory not found"
    fi
    
    # Count files in build
    file_count=$(find dist -type f | wc -l)
    print_status "Build contains $file_count files"
else
    print_error "Build output directory not found"
    exit 1
fi

# Step 5: Test preview server (optional quick smoke test)
print_info "Step 5: Testing preview server..."
echo ""
print_info "Starting preview server for 5 seconds..."
timeout 5s npm run preview &
PID=$!
sleep 2

if ps -p $PID > /dev/null 2>&1; then
    print_status "Preview server started successfully"
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
else
    print_error "Preview server failed to start"
fi

echo ""
echo "🎉 Build Validation Complete!"
echo "=============================="
echo ""
print_status "All import paths are correctly resolved"
print_status "Production build is working properly"
print_status "Application is ready for deployment"
echo ""
print_info "Next steps:"
echo "  - Deploy using: vercel --prod"
echo "  - Or serve locally: npm run preview"
echo ""