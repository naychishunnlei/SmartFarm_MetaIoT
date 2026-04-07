module.exports = {
    testEnvironment: 'node',
    // Ensure Jest knows where to find your tests in the subfolders
    roots: ['<rootDir>/testscripts/'],
    transform: {
        // Use babel-jest to transform both .js and .cjs files
        '^.+\\.[t|j]sx?$': 'babel-jest'
    },
    // Map module paths if you use absolute imports
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    modulePathIgnorePatterns: [
        '<rootDir>/frontend/',
        '<rootDir>/backend/node_modules'
    ]
}