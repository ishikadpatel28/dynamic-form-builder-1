import React, { useState, useCallback } from 'react';
import { Box, Button, MenuItem, Select, TextField, Typography, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, IconButton, Divider, Radio, Paper, Alert } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { SvgIcon } from '@mui/material';

const DeleteIcon = (props: any) => (
    <SvgIcon {...props}>
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </SvgIcon>
);

type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';

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
    id: string;
    type: FieldType;
    label: string;
    defaultValue?: string;
    options?: string[];
    validation: Validation;
    derived?: boolean;
    parentFields?: string[];
    formula?: string;
}

const CreateForm: React.FC = () => {
    const [fields, setFields] = useState<Field[]>([]);
    const [newField, setNewField] = useState<FieldType>('text');
    const [formName, setFormName] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
    const evalFormula = useCallback((formula: string, context: Record<string, any>) => {
        try {
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
            const values = Object.values(evalContext);

            const func = new Function(...params, `"use strict"; return (${formula});`);
            return func(...values);
        } catch (error) {
            console.error('Formula evaluation error:', error, 'Formula:', formula, 'Context:', context);
            return 'Error';
        }
    }, []);

    const updateDerivedFields = useCallback((values: Record<string, any>) => {
        const newValues = { ...values };
        let hasChanges = false;

        fields.forEach(field => {
            if (field.derived && field.parentFields && field.formula) {
                const context: Record<string, any> = {};
                let hasAllParents = true;

                field.parentFields.forEach(parentId => {
                    const parentField = fields.find(f => f.id === parentId);
                    if (parentField && parentId in values) {
                        context[parentField.label.toLowerCase().replace(/\s+/g, '_')] = values[parentId];
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
                }
            }
        });

        if (hasChanges) {
            setPreviewValues(newValues);
        }
    }, [fields, evalFormula]);

    const addField = () => {
        const id = uuidv4();
        const field: Field = {
            id,
            type: newField,
            label: '',
            validation: { required: false },
            options: newField === 'select' ? [] : undefined,
        };

        if (['select', 'radio', 'checkbox'].includes(newField)) {
            field.options = ['Option 1', 'Option 2'];
        }

        setFields((prev) => [...prev, field]);
    }

    const updateField = (id: string, updated: Partial<Field>) => {
        setFields((prev) =>
            prev.map((field) => (field.id === id ? { ...field, ...updated } : field))
        );
    };

    const deleteField = (id: string) => {
        setFields((prev) => prev.filter((field) => field.id !== id));
        setPreviewValues(prev => {
            const newValues = { ...prev };
            delete newValues[id];
            return newValues;
        });
    };

    const saveForm = () => {
        const formSchema = {
            name: formName,
            fields,
            createdAt: new Date().toISOString(),
        };

        localStorage.setItem(`form_${formName}`, JSON.stringify(formSchema));
        setOpenDialog(false);
        alert('Form saved successfully!');
        setFields([]);
        setFormName('');
        setPreviewValues({});
    };

    const handlePreviewChange = (fieldId: string, value: any) => {
        const newValues = { ...previewValues, [fieldId]: value };
        setPreviewValues(newValues);
        updateDerivedFields(newValues);
    };

    const getAvailableParentFields = (currentFieldId: string) => {
        return fields.filter(f => f.id !== currentFieldId && !f.derived && f.label.trim() !== '');
    };

    const renderPreviewField = (field: Field) => {
        const value = previewValues[field.id] ?? (field.type === 'checkbox' ? [] : '');

        if (field.derived) {
            return (
                <TextField
                    key={field.id}
                    fullWidth
                    label={`${field.label} (Auto-calculated)`}
                    value={value}
                    disabled
                    margin="normal"
                    sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }}
                />
            );
        }

        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
                return (
                    <TextField
                        key={field.id}
                        type={field.type}
                        fullWidth
                        label={field.label}
                        value={value}
                        onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                        margin="normal"
                    />
                );

            case 'textarea':
                return (
                    <TextField
                        key={field.id}
                        fullWidth
                        label={field.label}
                        value={value}
                        onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                        multiline
                        rows={3}
                        margin="normal"
                    />
                );

            case 'select':
                return (
                    <Box key={field.id} mb={2}>
                        <Typography>{field.label}</Typography>
                        <Select
                            fullWidth
                            value={value}
                            onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                        >
                            {field.options?.map((opt, i) => (
                                <MenuItem key={i} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                );

            case 'radio':
                return (
                    <Box key={field.id} mb={2}>
                        <Typography>{field.label}</Typography>
                        {field.options?.map((opt, i) => (
                            <FormControlLabel
                                key={i}
                                value={opt}
                                control={
                                    <Radio
                                        checked={value === opt}
                                        onChange={() => handlePreviewChange(field.id, opt)}
                                    />
                                }
                                label={opt}
                            />
                        ))}
                    </Box>
                );

            case 'checkbox':
                return (
                    <Box key={field.id} mb={2}>
                        <Typography>{field.label}</Typography>
                        {field.options?.map((opt, i) => (
                            <FormControlLabel
                                key={i}
                                control={
                                    <Checkbox
                                        checked={Array.isArray(value) && value.includes(opt)}
                                        onChange={(e) => {
                                            const currentValue = Array.isArray(value) ? value : [];
                                            const newValue = e.target.checked
                                                ? [...currentValue, opt]
                                                : currentValue.filter(v => v !== opt);
                                            handlePreviewChange(field.id, newValue);
                                        }}
                                    />
                                }
                                label={opt}
                            />
                        ))}
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Create Dynamic Form</Typography>

            <Box display="flex" gap={2} alignItems="center" mb={3}>
                <Select value={newField} onChange={(e) => setNewField(e.target.value as FieldType)}>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="textarea">Textarea</MenuItem>
                    <MenuItem value="select">Select</MenuItem>
                    <MenuItem value="radio">Radio</MenuItem>
                    <MenuItem value="checkbox">Checkbox</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                </Select>
                <Button variant="contained" onClick={addField}>
                    Add Field
                </Button>
                {fields.length > 0 && (
                    <Button
                        variant="outlined"
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                )}
            </Box>

            <Box display="flex" gap={3}>
                <Box flex={showPreview ? 1 : 2}>
                    <Typography variant="h6" gutterBottom>Form Builder</Typography>
                    <List>
                        {fields.map((field, index) => (
                            <Box key={field.id} mb={3}>
                                <ListItem>
                                    <Box width="100%">
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                            <Typography variant="h6">Field #{index + 1} - {field.type}</Typography>
                                            <IconButton onClick={() => deleteField(field.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>

                                        <TextField
                                            fullWidth
                                            label="Label"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            margin="normal"
                                        />

                                        {!field.derived && (
                                            <TextField
                                                fullWidth
                                                label="Default Value"
                                                value={field.defaultValue ?? ''}
                                                onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                                                margin="normal"
                                            />
                                        )}

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={field.validation.required}
                                                    onChange={(e) =>
                                                        updateField(field.id, {
                                                            validation: {
                                                                ...field.validation,
                                                                required: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                />
                                            }
                                            label="Required"
                                        />

                                        {field.type === 'text' || field.type === 'textarea' ? (
                                            <Box>
                                                <TextField
                                                    type="number"
                                                    label="Min Length"
                                                    value={field.validation.minLength || ''}
                                                    onChange={(e) =>
                                                        updateField(field.id, {
                                                            validation: {
                                                                ...field.validation,
                                                                minLength: Number(e.target.value),
                                                            },
                                                        })
                                                    }
                                                    margin="normal"
                                                    size="small"
                                                    sx={{ mr: 2 }}
                                                />
                                                <TextField
                                                    type="number"
                                                    label="Max Length"
                                                    value={field.validation.maxLength || ''}
                                                    onChange={(e) =>
                                                        updateField(field.id, {
                                                            validation: {
                                                                ...field.validation,
                                                                maxLength: Number(e.target.value),
                                                            },
                                                        })
                                                    }
                                                    margin="normal"
                                                    size="small"
                                                />
                                                <Box>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={field.validation.email || false}
                                                                onChange={(e) =>
                                                                    updateField(field.id, {
                                                                        validation: {
                                                                            ...field.validation,
                                                                            email: e.target.checked,
                                                                        },
                                                                    })
                                                                }
                                                            />
                                                        }
                                                        label="Email Format"
                                                    />
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={field.validation.password || false}
                                                                onChange={(e) =>
                                                                    updateField(field.id, {
                                                                        validation: {
                                                                            ...field.validation,
                                                                            password: e.target.checked,
                                                                        },
                                                                    })
                                                                }
                                                            />
                                                        }
                                                        label="Password Rule"
                                                    />
                                                </Box>
                                            </Box>
                                        ) : null}

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={field.derived || false}
                                                    onChange={(e) =>
                                                        updateField(field.id, { derived: e.target.checked })
                                                    }
                                                />
                                            }
                                            label="Is Derived Field?"
                                        />

                                        {field.derived && (
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>Parent Fields:</Typography>
                                                {getAvailableParentFields(field.id).map(parentField => (
                                                    <FormControlLabel
                                                        key={parentField.id}
                                                        control={
                                                            <Checkbox
                                                                checked={field.parentFields?.includes(parentField.id) || false}
                                                                onChange={(e) => {
                                                                    const current = field.parentFields || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current, parentField.id]
                                                                        : current.filter(id => id !== parentField.id);
                                                                    updateField(field.id, { parentFields: updated });
                                                                }}
                                                            />
                                                        }
                                                        label={`${parentField.label} (${parentField.type})`}
                                                    />
                                                ))}

                                                <TextField
                                                    fullWidth
                                                    label="Formula / Logic"
                                                    value={field.formula || ''}
                                                    onChange={(e) => updateField(field.id, { formula: e.target.value })}
                                                    margin="normal"
                                                    helperText="Use field labels in lowercase with underscores (e.g., calculateAge(date_of_birth))"
                                                />

                                                {field.parentFields && field.parentFields.length > 0 && field.formula && (
                                                    <Alert severity="info" sx={{ mt: 1 }}>
                                                        Available variables: {field.parentFields.map(id => {
                                                            const parentField = fields.find(f => f.id === id);
                                                            return parentField?.label.toLowerCase().replace(/\s+/g, '_');
                                                        }).join(', ')}
                                                    </Alert>
                                                )}
                                            </Box>
                                        )}

                                        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && !field.derived && (
                                            <Box mb={2}>
                                                <Typography variant="subtitle1">Options</Typography>
                                                {field.options?.map((option, optIdx) => (
                                                    <Box key={optIdx} display="flex" alignItems="center" mb={1} gap={1}>
                                                        <TextField
                                                            label={`Option ${optIdx + 1}`}
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...(field.options ?? [])];
                                                                newOptions[optIdx] = e.target.value;
                                                                updateField(field.id, { options: newOptions });
                                                            }}
                                                            size="small"
                                                        />
                                                        {field.options && field.options.length > 2 && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    const newOptions = field.options!.filter((_, i) => i !== optIdx);
                                                                    updateField(field.id, { options: newOptions });
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        <FormControlLabel
                                                            control={
                                                                field.type === 'checkbox' ? (
                                                                    <Checkbox
                                                                        checked={Array.isArray(field.validation['correctAnswers']) ?
                                                                            field.validation['correctAnswers'].includes(option) : false}
                                                                        onChange={(e) => {
                                                                            let correctAnswers = Array.isArray(field.validation['correctAnswers'])
                                                                                ? [...field.validation['correctAnswers']]
                                                                                : [];
                                                                            if (e.target.checked) {
                                                                                correctAnswers.push(option);
                                                                            } else {
                                                                                correctAnswers = correctAnswers.filter(ans => ans !== option);
                                                                            }
                                                                            updateField(field.id, {
                                                                                validation: {
                                                                                    ...field.validation,
                                                                                    correctAnswers,
                                                                                },
                                                                            });
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Radio
                                                                        checked={field.validation['correctAnswer'] === option}
                                                                        onChange={() =>
                                                                            updateField(field.id, {
                                                                                validation: {
                                                                                    ...field.validation,
                                                                                    correctAnswer: option,
                                                                                },
                                                                            })
                                                                        }
                                                                    />
                                                                )
                                                            }
                                                            label="Correct"
                                                        />
                                                    </Box>
                                                ))}
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => {
                                                        const newOptions = [...(field.options ?? []), `Option ${field.options!.length + 1}`];
                                                        updateField(field.id, { options: newOptions });
                                                    }}
                                                >
                                                    Add Option
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                </ListItem>
                                <Divider />
                            </Box>
                        ))}
                    </List>
                </Box>

                {showPreview && fields.length > 0 && (
                    <Box flex={1}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Live Preview</Typography>
                            <Box>
                                {fields.map(field => (
                                    field.label ? renderPreviewField(field) : null
                                ))}
                                {fields.some(f => f.derived) && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        Derived fields will auto-update as you change parent fields above.
                                    </Alert>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Box>

            <Box mt={3}>
                <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)} disabled={fields.length === 0}>
                    Save Form
                </Button>
            </Box>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Save Form</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Form Name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={saveForm} variant="contained" color="primary" disabled={!formName}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CreateForm;