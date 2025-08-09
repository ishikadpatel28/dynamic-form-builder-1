import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    TextField,
    Typography,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    RadioGroup,
    Radio,
    FormHelperText,
    Button,
    Alert,
} from '@mui/material';

interface Validation {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    email?: boolean;
    password?: boolean;
    correctAnswers?: string[];
    correctAnswer?: string;
}

interface Field {
    derived?: boolean;
    parentFields?: string[];
    formula?: string;
    id: string;
    type: string;
    label: string;
    defaultValue?: string;
    options?: string[];
    validation: Validation;
}

interface FormSchema {
    name: string;
    fields: Field[];
}

const PreviewForm: React.FC = () => {
    const [schema, setSchema] = useState<FormSchema | null>(null);
    const [values, setValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const { formId } = useParams<{ formId: string }>();

    useEffect(() => {
        if (!formId) return;

        const stored = localStorage.getItem(formId);
        if (stored) {
            const parsed = JSON.parse(stored) as FormSchema;
            setSchema(parsed);

            const defaults: Record<string, any> = {};
            parsed.fields.forEach((f) => {
                if (!f.derived) {
                    defaults[f.id] = f.defaultValue || (f.type === 'checkbox' ? [] : '');
                }
            });
            setValues(defaults);
        }
    }, [formId]);

    const evalFormula = useCallback((formula: string, context: Record<string, any>) => {
        try {
            let contextValues = Object.values(context);
            if (contextValues.some(val => val === '' || val === undefined || val === null)) {
                return '';
            }

            const safeContext = { ...context };

            const helpers = {
                Date: Date,
                Math: Math,
                parseInt: parseInt,
                parseFloat: parseFloat,
                calculateAge: (birthDate: string) => {
                    if (!birthDate) return 0;
                    const today = new Date();
                    const birth = new Date(birthDate);
                    if (isNaN(birth.getTime())) return 0;

                    let age = today.getFullYear() - birth.getFullYear();
                    const monthDiff = today.getMonth() - birth.getMonth();

                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                        age--;
                    }
                    return age;
                }
            };

            const evalContext = { ...safeContext, ...helpers };

            const params = Object.keys(evalContext);
            contextValues = Object.values(evalContext);

            const func = new Function(...params, `"use strict"; return (${formula});`);
            return func(...contextValues);
        } catch (error) {
            console.error('Formula evaluation error:', error, 'Formula:', formula, 'Context:', context);
            return 'Error';
        }
    }, []);

    const updateDerivedFields = useCallback((currentValues: Record<string, any>) => {
        if (!schema) return currentValues;

        const newValues = { ...currentValues };
        let hasChanges = false;

        schema.fields.forEach(field => {
            if (field.derived && field.parentFields && field.formula) {
                const context: Record<string, any> = {};
                let hasAllParents = true;

                field.parentFields.forEach(parentId => {
                    const parentField = schema.fields.find(f => f.id === parentId);
                    if (parentField && parentId in currentValues) {
                        const variableName = parentField.label.toLowerCase().replace(/\s+/g, '_');
                        context[variableName] = currentValues[parentId];
                    } else {
                        hasAllParents = false;
                    }
                });

                if (hasAllParents) {
                    const computedValue = evalFormula(field.formula, context);
                    
                    if (newValues[field.id] !== computedValue) {
                        newValues[field.id] = computedValue;
                        hasChanges = true;
                    }
                } else {
                    if (field.id in newValues) {
                        delete newValues[field.id];
                        hasChanges = true;
                    }
                }
            }
        });

        return hasChanges ? newValues : currentValues;
    }, [schema, evalFormula]);

    useEffect(() => {
        if (!schema || Object.keys(values).length === 0) return;

        const updatedValues = updateDerivedFields(values);
        if (updatedValues !== values) {
            setValues(updatedValues);
        }
    }, [schema, values, updateDerivedFields]);

    const validateField = useCallback((field: Field, value: any): string => {
        const { validation } = field;

        if (validation.required && (!value || (Array.isArray(value) && value.length === 0))) {
            return 'This field is required.';
        }

        if (typeof value === 'string') {
            if (validation.minLength && value.length < validation.minLength) {
                return `Minimum length is ${validation.minLength}`;
            }
            if (validation.maxLength && value.length > validation.maxLength) {
                return `Maximum length is ${validation.maxLength}`;
            }
            if (validation.email && value && !/^\S+@\S+\.\S+$/.test(value)) {
                return 'Invalid email format.';
            }
            if (validation.password && value &&
                (!/^.{8,}$/.test(value) || !/\d/.test(value))) {
                return 'Password must be at least 8 characters and contain a number.';
            }
        }

        return '';
    }, []);

    const handleChange = useCallback((id: string, value: any) => {
        const newValues = { ...values, [id]: value };
        
        const updatedValues = updateDerivedFields(newValues);
        setValues(updatedValues);

        const field = schema?.fields.find(f => f.id === id);
        if (field && !field.derived) {
            const err = validateField(field, value);
            setErrors(prev => ({ ...prev, [id]: err }));
        }
    }, [values, updateDerivedFields, schema, validateField]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);

        const newErrors: Record<string, string> = {};

        schema?.fields.forEach(field => {
            if (!field.derived) {
                const err = validateField(field, values[field.id]);
                if (err) newErrors[field.id] = err;
            }
        });

        setErrors(newErrors);

        let correct = true;
        let feedback = '';

        schema?.fields.forEach(field => {
            const fieldValue = values[field.id];

            if ((field.type === 'radio' || field.type === 'select') && field.validation.correctAnswer) {
                if (fieldValue !== field.validation.correctAnswer) {
                    correct = false;
                    feedback += `${field.label}: Incorrect answer.\n`;
                }
            }

            if (field.type === 'checkbox' && Array.isArray(field.validation.correctAnswers)) {
                const userAnswers = Array.isArray(fieldValue) ? fieldValue : [];
                const correctAnswers = field.validation.correctAnswers;

                if (userAnswers.length !== correctAnswers.length ||
                    !correctAnswers.every(ans => userAnswers.includes(ans))) {
                    correct = false;
                    feedback += `${field.label}: Incorrect answer.\n`;
                }
            }
        });

        setResult(correct ? 'All answers are correct!' : feedback || 'Some answers are incorrect.');

        if (Object.keys(newErrors).length === 0) {
            console.log('Form Values:', values);
            alert('Form submitted successfully (check console for values)!');
        }
    };

    if (!schema) {
        return <Typography>Loading form...</Typography>;
    }

    return (
        <Box p={4}>
            <Typography variant="h4" gutterBottom>
                Preview: {schema.name}
            </Typography>

            <Box component="form" display="flex" flexDirection="column" gap={3} onSubmit={handleSubmit}>
                {schema.fields.map(field => {
                    const value = values[field.id] ?? (field.type === 'checkbox' ? [] : '');
                    const error = errors[field.id] ?? '';
                    const isDisabled = field.derived || false;

                    switch (field.type) {
                        case 'text':
                        case 'number':
                        case 'date':
                            return (
                                <TextField
                                    key={field.id}
                                    type={field.type}
                                    label={`${field.label}${isDisabled ? ' (Auto-calculated)' : ''}`}
                                    value={value}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    error={!!error}
                                    helperText={error || (isDisabled ? 'This field is automatically calculated' : '')}
                                    disabled={isDisabled}
                                    sx={isDisabled ? { '& .MuiInputBase-input': { color: 'text.secondary' } } : {}}
                                />
                            );

                        case 'textarea':
                            return (
                                <TextField
                                    key={field.id}
                                    label={`${field.label}${isDisabled ? ' (Auto-calculated)' : ''}`}
                                    value={value}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    error={!!error}
                                    helperText={error || (isDisabled ? 'This field is automatically calculated' : '')}
                                    multiline
                                    rows={3}
                                    disabled={isDisabled}
                                    sx={isDisabled ? { '& .MuiInputBase-input': { color: 'text.secondary' } } : {}}
                                />
                            );

                        case 'select':
                            return (
                                <Box key={field.id}>
                                    <Typography>
                                        {field.label}{isDisabled ? ' (Auto-calculated)' : ''}
                                    </Typography>
                                    <Select
                                        fullWidth
                                        value={value}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        disabled={isDisabled}
                                        sx={isDisabled ? { color: 'text.secondary' } : {}}
                                    >
                                        {field.options?.map((opt, i) => (
                                            <MenuItem key={i} value={opt}>
                                                {opt}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {error && <FormHelperText error>{error}</FormHelperText>}
                                    {isDisabled && <FormHelperText>This field is automatically calculated</FormHelperText>}
                                </Box>
                            );

                        case 'radio':
                            return (
                                <Box key={field.id}>
                                    <Typography>
                                        {field.label}{isDisabled ? ' (Auto-calculated)' : ''}
                                    </Typography>
                                    <RadioGroup
                                        value={value}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                    >
                                        {field.options?.map((opt, i) => (
                                            <FormControlLabel
                                                key={i}
                                                value={opt}
                                                control={<Radio disabled={isDisabled} />}
                                                label={opt}
                                                sx={isDisabled ? { color: 'text.secondary' } : {}}
                                            />
                                        ))}
                                    </RadioGroup>
                                    {error && <FormHelperText error>{error}</FormHelperText>}
                                    {isDisabled && <FormHelperText>This field is automatically calculated</FormHelperText>}
                                </Box>
                            );

                        case 'checkbox':
                            return (
                                <Box key={field.id}>
                                    <Typography>
                                        {field.label}{isDisabled ? ' (Auto-calculated)' : ''}
                                    </Typography>
                                    {field.options?.map((opt, i) => (
                                        <FormControlLabel
                                            key={i}
                                            control={
                                                <Checkbox
                                                    checked={Array.isArray(value) && value.includes(opt)}
                                                    onChange={(e) => {
                                                        if (!isDisabled) {
                                                            const checked = e.target.checked;
                                                            const currentValue = Array.isArray(value) ? value : [];
                                                            const newValue = checked
                                                                ? [...currentValue, opt]
                                                                : currentValue.filter(v => v !== opt);
                                                            handleChange(field.id, newValue);
                                                        }
                                                    }}
                                                    disabled={isDisabled}
                                                />
                                            }
                                            label={opt}
                                            sx={isDisabled ? { color: 'text.secondary' } : {}}
                                        />
                                    ))}
                                    {error && <FormHelperText error>{error}</FormHelperText>}
                                    {isDisabled && <FormHelperText>This field is automatically calculated</FormHelperText>}
                                </Box>
                            );

                        default:
                            return null;
                    }
                })}

                <Button variant="contained" type="submit" size="large">
                    Submit
                </Button>
            </Box>

            {submitted && result && (
                <Box mt={2}>
                    <Alert severity={result === 'All answers are correct!' ? 'success' : 'error'}>
                        {result}
                    </Alert>
                </Box>
            )}
        </Box>
    );
};

export default PreviewForm;