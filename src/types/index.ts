export interface ValidationRule {
    type: string;
    message: string;
    isValid: (value: any) => boolean;
}

export interface FormField {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    required: boolean;
    validationRules?: ValidationRule[];
}

export interface FormConfig {
    title: string;
    fields: FormField[];
}