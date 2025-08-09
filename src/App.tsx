import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import CreateForm from './components/CreateForm';
import PreviewForm from './components/PreviewForm';
import MyForms from './components/MyForms';

const App: React.FC = () => {
    return (
        <Router>
            <Switch>
                <Route path="/create-form" component={CreateForm} />
                <Route path="/preview-form/:formId" component={PreviewForm} />
                <Route path="/my-forms" component={MyForms} />
                <Redirect from="/" to="/create-form" exact />
            </Switch>
        </Router>
    );
};

export default App;