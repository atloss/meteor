import { accessSync } from "fs";
import { Color } from "./Color";
import {
  FigmaApi,
  FigmaApiResponse,
  type FigmaVariable,
  type FigmaVariableCollection,
} from "./figmaApi";
import { set } from "./common/domain/utils/object";
import { kebabCase } from "./common/domain/utils/string";

type DictionaryValue = {
  $value: string;

  // TODO: are we able to make a union of all possible types?
  $type: string;
};

type DictionaryTree = {
  [key: string]: DictionaryValue | DictionaryTree;
};

export class Dictionary {
  // TODO: use inferred type from zod schema
  private constructor(public readonly value: DictionaryTree) {
    // TODO: add zod validation
  }

  public static fromFigmaApiResponse(
    // TODO: use inferred type from zod schema
    response: FigmaApiResponse,
    options?: {
      remoteFiles?: FigmaApiResponse[];
    }
  ): Dictionary {
    const remoteFiles = options?.remoteFiles ?? [];

    const collections = Object.values(response.meta.variableCollections);
    const variables = Object.values(response.meta.variables);

    const modes = collections.reduce<{ modeId: string; name: string }[]>(
      (accumulator, collection) => {
        const uniqueModes = collection.modes.filter(
          (mode) => !accumulator.some((m) => m.modeId === mode.modeId)
        );

        accumulator.push(...uniqueModes);

        return accumulator;
      },
      []
    );

    // TODO: should we throw an error if we have two different modes with the same name?
    const result = modes.reduce((accumulator, mode) => {
      // TODO: add toKebabCase function
      accumulator[mode.name.toLowerCase()] = variables.reduce(
        (accumulatedVariables, variable) => {
          const path = kebabCase(variable.name);

          const rawValue = variable.valuesByMode[mode.modeId];
          const itIsAnAliasedToken =
            typeof rawValue === "object" &&
            "type" in rawValue &&
            rawValue.type === "VARIABLE_ALIAS";

          if (itIsAnAliasedToken) {
            const path = kebabCase(variable.name);

            const referencedVariable = variables.find(
              (variable) => variable.id === rawValue.id
            );

            const referencedVariableExistsLocally = referencedVariable;
            if (referencedVariableExistsLocally) {
              set(accumulatedVariables, path, {
                $value: `{${kebabCase(referencedVariable.name)}}`,
                $type: variable.resolvedType.toLowerCase(),
              });

              return accumulatedVariables;
            }

            const keyOfRemoteVariable = rawValue.id
              .split("/")[0]
              .replace("VariableID:", "");

            const idOfRemoteVariable = `VariableID:${
              rawValue.id.split("/")[1]
            }`;

            const remoteVariable = remoteFiles.reduce<FigmaVariable | null>(
              (accumulatedVariable, remoteFile) => {
                // TODO: generally find every variable trough their key
                // TODO: update data in the test so it's easier to know what is
                //  relevant and what is not
                const potentialVariable = Object.values(
                  remoteFile.meta.variables
                ).find((variable) => {
                  return variable.key === keyOfRemoteVariable;
                });

                if (potentialVariable) {
                  return potentialVariable;
                }

                return accumulatedVariable;
              },
              null
            );
            const referencedVariableExistsInRemoteFile = !!remoteVariable;

            if (referencedVariableExistsInRemoteFile) {
              set(accumulatedVariables, path, {
                $value: `{${kebabCase(remoteVariable.name)}}`,
                $type: variable.resolvedType.toLowerCase(),
              });

              return accumulatedVariables;
            }

            throw new Error(
              `Failed to create dictionary: Referenced variable with id ${rawValue.id} does not exist locally or in remote file`
            );
          }

          const itIsAColorValue =
            typeof rawValue === "object" && "r" in rawValue;

          if (itIsAColorValue) {
            // TODO: should we validate that the naming convention is followed? and if yes where? here or in the figmaApi?
            const path = kebabCase(variable.name);

            set(accumulatedVariables, path, {
              $value: Color.fromRGB(
                rawValue.r * 255,
                rawValue.g * 255,
                rawValue.b * 255,
                rawValue.a
              ).toHex(),
              $type: variable.resolvedType.toLowerCase(),
            });

            return accumulatedVariables;
          }

          throw new Error(
            "Failed to create dictionary: Value is not a color value"
          );
        },
        { $type: "mode" }
      );

      return accumulator;
    }, {});

    return new Dictionary(result);
  }

  public toJSON() {
    return JSON.stringify(this.value, null, 2);
  }
}
