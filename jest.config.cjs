module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    moduleNameMapper: {
        '^bcryptjs$': '<rootDir>/backend/node_modules/bcryptjs',
        '^jsonwebtoken$': '<rootDir>/backend/node_modules/jsonwebtoken'
    },
    modulePathIgnorePatterns: [
        '<rootDir>/frontend/'
    ]
}