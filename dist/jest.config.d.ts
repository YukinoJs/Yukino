declare namespace _default {
    let preset: string;
    let testEnvironment: string;
    let testMatch: string[];
    let collectCoverageFrom: string[];
    let coverageDirectory: string;
    let coverageReporters: string[];
    let extensionsToTreatAsEsm: string[];
    let moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': string;
    };
    let transform: {
        '^.+\\.tsx?$': (string | {
            useESM: boolean;
        })[];
    };
}
export default _default;
//# sourceMappingURL=jest.config.d.ts.map