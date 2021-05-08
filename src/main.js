
import Home from './module/Home.svelte';



const App = {

    init: function() {
        console.log('=> App.init()');

        // Initialize Application User
        // App.User = {};

        // Initialize Application State
        App.State = {
            hasHandReceipt: false,
        };

        // Initialize Application Globals/Constants
        // App['TIMEOUT'] = 1000 * 60 * 30;

        //? check if HR exist in storage
        //? assume they do not 

        App.load();
    },

    load: function() {
        console.log('=> App.load()');



        const config = {
            target: document.body,
            props: {
                hand_receipt : App.State.hasHandReceipt,
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
    },

    getHandReceipt: function() {
        // hand_receipt : function(){
            //check if hand rectip exist
        // }
    }
};

window.onload = () => {
    App.init();
};
