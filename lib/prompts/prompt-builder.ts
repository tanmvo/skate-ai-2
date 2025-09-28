/**
 * Prompt templating system for Skate AI
 * Provides modular, composable prompt templates with variable substitution
 */

export interface PromptSection {
  id: string;
  content: string;
  variables?: string[];
}

export type PromptVariable = string | number | boolean | object | null | undefined;

export interface PromptTemplate {
  sections: PromptSection[];
  variables: Record<string, PromptVariable>;
}

export class PromptBuilder {
  private template: PromptTemplate;

  constructor() {
    this.template = {
      sections: [],
      variables: {}
    };
  }

  /**
   * Add a section to the prompt template
   */
  addSection(section: PromptSection): this {
    this.template.sections.push(section);
    return this;
  }

  /**
   * Set variables for template substitution
   */
  setVariables(variables: Record<string, PromptVariable>): this {
    this.template.variables = { ...this.template.variables, ...variables };
    return this;
  }

  /**
   * Set a single variable
   */
  setVariable(key: string, value: PromptVariable): this {
    this.template.variables[key] = value;
    return this;
  }

  /**
   * Build the final prompt by combining sections and substituting variables
   */
  build(): string {
    return this.template.sections
      .map(section => this.substituteVariables(section.content, this.template.variables))
      .join('\n\n');
  }

  /**
   * Substitute variables in template content
   */
  private substituteVariables(content: string, variables: Record<string, PromptVariable>): string {
    return content.replace(/\$\{(\w+)\}/g, (match, varName) => {
      const value = variables[varName];
      if (value === undefined) {
        console.warn(`Warning: Variable ${varName} not found in template variables`);
        return match; // Return original placeholder if variable not found
      }
      return String(value);
    });
  }

  /**
   * Clear all sections and variables
   */
  reset(): this {
    this.template.sections = [];
    this.template.variables = {};
    return this;
  }

  /**
   * Get current template state (for debugging)
   */
  getTemplate(): PromptTemplate {
    return { ...this.template };
  }
}

/**
 * Load a prompt section from a template file
 */
export async function loadPromptSection(sectionId: string): Promise<PromptSection> {
  try {
    const importedModule = await import(`./components/${sectionId}`);
    return importedModule.default as PromptSection;
  } catch (error) {
    throw new Error(`Failed to load prompt section: ${sectionId}. ${error}`);
  }
}

/**
 * Create a new prompt builder instance
 */
export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder();
}