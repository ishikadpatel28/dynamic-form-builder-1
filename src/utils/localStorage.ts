export const saveForm = (formId: string, formConfig: any) => {
    localStorage.setItem(formId, JSON.stringify(formConfig));
};

export const getForm = (formId: string) => {
    const formConfig = localStorage.getItem(formId);
    return formConfig ? JSON.parse(formConfig) : null;
};

export const getAllForms = () => {
    const forms: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            forms[key] = JSON.parse(localStorage.getItem(key) || '{}');
        }
    }
    return forms;
};

export const deleteForm = (formId: string) => {
    localStorage.removeItem(formId);
};