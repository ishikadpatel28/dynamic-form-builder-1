import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { useHistory } from 'react-router-dom';

interface FormSchema {
  name: string;
  createdAt: string;
  fields: any[];
}

const MyForms: React.FC = () => {
  const [forms, setForms] = useState<{ key: string; data: FormSchema }[]>([]);
  const history = useHistory();

  useEffect(() => {
    const formKeys = Object.keys(localStorage).filter((key) => key.startsWith('form_'));
    const loadedForms = formKeys.map((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw) as FormSchema;
        return { key, data };
      } catch (e) {
        console.error(`Error parsing form ${key}:`, e);
        return null;
      }
    }).filter(Boolean) as { key: string; data: FormSchema }[];

    setForms(loadedForms);
  }, []);

  const handleClick = (key: string) => {
    history.push(`/preview-form/${encodeURIComponent(key)}`);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Saved Forms</Typography>
      <List>
        {forms.map(({ key, data }) => (
          <React.Fragment key={key}>
            <ListItemButton onClick={() => handleClick(key)}>
              <ListItemText
                primary={data.name}
                secondary={`Created: ${new Date(data.createdAt).toLocaleString()}`}
              />
            </ListItemButton>
            <Divider />
          </React.Fragment>
        ))}
        {forms.length === 0 && (
          <Typography>No saved forms found.</Typography>
        )}
      </List>
    </Box>
  );
};

export default MyForms;
