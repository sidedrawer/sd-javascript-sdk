import {Environment} from "../models/environment.enum";
import {environmentDevelopment} from "./environment.development";
import {environmentProduction} from "./environment.production";
import {environmentSandbox} from "./environment.sandbox";
import {environmentUat} from "./environment.uat";

export const env = (environment: Environment) => {
    switch (environment) {
        case Environment.development:
            return environmentDevelopment;
        case Environment.production:
            return environmentProduction;
        case Environment.sandbox:
            return environmentSandbox;
        case Environment.uat:
            return environmentUat;
    }
}
