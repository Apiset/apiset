
import * as path from 'path';
import * as fs from 'fs';
import * as configUtil from './config-util';

import {readAPI} from "../reader/api";
import {GeneratorModule} from "./generator-module";
import {listGeneratorModules} from "./generator-module";
import {API} from "../api/api";
import {Generator, Config} from "./generator";

const globalPath = process.platform === "win32" ? path.normalize(process.env.APPDATA + "/npm/node_modules") :
    path.normalize("/usr/local/lib/node_modules");

const localPath = path.normalize("node_modules");
const configFile = "./apiscript.json";

function runGenerator(api: API, module: GeneratorModule, config: Config) {
    let generator = require(module[1]) as Generator;

    if (config) {
        generator.generate(api, config);
    } else {
        generator.generate(api, {});
    }
}

export function run(globalConfig: Config = {}) {

    // load from apiscript.json and merge with config
    if (fs.existsSync(configFile)) {
        let loadedData = fs.readFileSync(configFile, "UTF-8");
        let loadedConfig = JSON.parse(loadedData);

        globalConfig = configUtil.mergeConfigs(globalConfig, loadedConfig);
    } else {
        globalConfig = configUtil.duplicateConfig(globalConfig);
    }

    let config = globalConfig.apiscript;
    if (!config) { config = {}; }

    if (!config.list) {
        if (!config.api) {
            console.log("The API must be specified.");
            return;
        }

        if (!fs.existsSync(config.api + ".api")) {
            console.log(`Could not find the file "${config.api}.api"`);
            return;
        }
    }

    let globalModules: GeneratorModule[] = [];
    let localModules: GeneratorModule[] = [];

    if (fs.existsSync(globalPath)) {
        globalModules = listGeneratorModules(globalPath);
    }

    if (fs.existsSync(localPath)) {
        localModules = listGeneratorModules(localPath);
    }

    if (globalModules.length == 0 && localModules.length == 0) {
        console.log("Could not find any generators.");
        return;
    }

    let allModules: GeneratorModule[] = [];
    for (let module of globalModules) { allModules.push(module); }
    for (let module of localModules) { allModules.push(module); }

    if (config.list) {
        for (let module of allModules) { console.log(module[0]); }
        return;
    }

    let debug = config.debug ? config.debug : false;
    let api = readAPI(`${config.api}.api`, debug);

    if (config.generators) {
        let generatorNames = config.generators;

        for (let name of generatorNames) {
            let module: GeneratorModule;

            for (let mod of allModules) {

                if (mod[0] === name) {
                    module = mod;
                    break;
                }
            }

            if (!module) {
                console.log(`Could not find the generator "${name}".`);
                return;
            }

            runGenerator(api, module, globalConfig[name]);
        }

    } else {

        for (let module of localModules) {
            runGenerator(api, module, globalConfig[module[0]]);
        }
    }
}