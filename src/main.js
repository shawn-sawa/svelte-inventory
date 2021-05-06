
import Home from './module/Home.svelte';

const App = {

    init: function() {
        console.log('=> App.init()');

        // Initialize Application User
        // App.User = {};

        // Initialize Application State
        // App.State = {};

        // Initialize Application Globals/Constants
        // App['TIMEOUT'] = 1000 * 60 * 30;

        App.load();
    },

    load: function() {
        console.log('=> App.load()');

        const config = {
            target: document.body,
            props: {
                name: 'Shawn'
            }
        };

        App.render(config).exec();
    },

    exec: function() {
        console.log('=> App.exec()');

        // Global Event Handlers go here...
    },

    render: function(content) {
        App.Home = new Home(content);

        return this;
    }
};

window.onload = () => {
    App.init();
};
