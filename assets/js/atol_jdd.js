/* ** ****************************************************************** ** */
/* ** DEFINITION DES FONCTIONS ET CLASSES ****************************** ** */
/* ** ****************************************************************** ** */

const global = {};

class Loader {
    /**
     * @type {HTMLDivElement|null}
     */
    static #loader = null;

    static create() {
        const overlay = document.createElement('div');
        overlay.classList.add('overlay');

        const spinner = document.createElement('div');
        spinner.classList.add('spinner');

        overlay.appendChild(spinner);

        document.body.appendChild(overlay);

        this.#loader = overlay;
    }

    static remove() {
        this.#loader.remove();
        delete this;
    }
}

const fetchJson = async (url) => {
    try {
        return (fetch(url).then(r => r.json()));
    } catch (e) {
        return e;
    }
};

/**
 * @returns {Promise<Array<Object>|Error>}
 */
const getJdds = async () => {
    return await fetchJson(`https://atol-jdds.api.orange.nicolaschoquet.fr/jdds`);
};

const getTypes = async () => await fetchJson(`https://atol-jdds.api.orange.nicolaschoquet.fr/types`);

const getEnvironments = async () => await fetchJson(`https://atol-jdds.api.orange.nicolaschoquet.fr/environments`);

/**
 * @param {Array<Object>} jdds
 * @param {String} type
 * @returns {*}
 */
const getJddsOfType = (jdds, type) => jdds.reduce((r, c) => c.type === type ? [...r, c] : r, []);

/**
 * @param {String} str
 * @param {String} substr
 * @param {Number} n
 */
const insertSubStringBetweenNCharacters = (str, substr, n) => {
    const splitStr = str.split('');
    let i = 0;
    return splitStr.reduce((r, c) => {
        let result = r + c;
        if (i === n - 1 && c !== substr) {
            result = r + c + substr;
            i = 0;
        }
        i++;
        return result;
    }, '');
};

/**
 * @param {{nd?: String, email?: String, password?: String, case?: String}} data
 * @returns {string}
 */
const jddArrayTemplate = (data) => `<tr>
    <td>
        ${data.nd !== undefined ? '<a href="#" data-command="insert-nd" title="insérer dans la page">' : ''}
            ${data.nd || '<center> // </center>'}
        ${data.nd !== undefined ? '</a>' : ''}
    </td>
    <td>
        ${data.email !== undefined ? '<a href="#" data-command="insert-email" title="insérer dans la page">' : ''}
            ${data.email || '<center> // </center>'}</td>
        ${data.email !== undefined ? '</a>' : ''}
    <td>${data.password || '<center> // </center>'}</td>
    <td>${data.case ? insertSubStringBetweenNCharacters(data.case, '\n', 42) : '<center> // </center>'}</td>
</tr>`;

/**
 * @param {Array<Object>} jdds
 * @param {string} type
 * @returns {string}
 */
const jdds2HtmlArray = (jdds, type) => getJddsOfType(jdds, type).reduce((r, c) =>  `${r}${jddArrayTemplate(c)}`, '');

/**
 * @param {Element} subTab 
 */
const setNewActiveSubTab = subTab => {
    Array.from(document.querySelectorAll('.sub-tab.active'))
        ?.map(t => t?.classList.remove('active'));
    subTab?.classList.add('active');

    Array.from(document.querySelectorAll('[data-type].active'))
        ?.map(t => t?.classList.remove('active'));
    Array.from(document.querySelectorAll(`[data-type="${subTab.getAttribute('data-target')}"]`))
        ?.map(t => t?.classList.add('active'));
};

/**
 * @param {Element} tab
 * @param {Element[]} subTabs
 */
const setNewActiveTab = (tab, subTabs) => {
    if (!tab.classList.contains('active')) {
        const activeTab = document.querySelector('#popup_header > thead tr th.active');
        activeTab.classList.remove('active');
        document.querySelector(`.${activeTab.getAttribute('data-target')}-tab-content`)?.classList.remove('active');

        tab.classList.add('active');
        document.querySelector(`.${tab.getAttribute('data-target')}-tab-content`)?.classList.add('active')
    
        const activeSubTab = document.querySelector('.sub-tab.active') 
            ? document.querySelector('.sub-tab.active') : subTabs[0];
        setNewActiveSubTab(activeSubTab);
    }
};

/**
 * @param {String} message
 * @param {'error'|'warning'} type
 * @returns {HTMLDivElement}
 */
const createAlert = (message, type = 'error') => {
    const messageContainer = document.createElement('div');
    messageContainer.setAttribute('id', `atol-jdds-popup-${type}`);
    messageContainer.style.position = 'absolute';
    messageContainer.style.left = '0';
    messageContainer.style.right = '0';
    messageContainer.style.top = '0';
    messageContainer.style.minHeight = '50px';
    messageContainer.style.padding = '10px';
    if (type === 'error') {
        messageContainer.style.background = '#FF2B00';
    } else if (type === 'warning') {
        messageContainer.style.background = '#FF8200';
    } else {
        messageContainer.style.background = '#FFFFFF';
        messageContainer.style.borderBottom = '1px solid black';
    }
    messageContainer.style.display = 'flex';
    messageContainer.style.flexDirection = 'row';
    messageContainer.style.justifyContent = 'start';
    messageContainer.style.alignItems = 'center';
    messageContainer.style.zIndex = '9999';
    messageContainer.innerText = message;

    const closeButton = document.createElement('button');
    closeButton.style.position = 'absolute';
    closeButton.style.right = '5px';
    closeButton.style.top = '5px';
    closeButton.style.bottom = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.innerHTML = '✖';

    /**
     * @param {MouseEvent} e
     */
    const closeHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        messageContainer.remove();
        closeButton.removeEventListener('click', closeHandler);
    };

    closeButton.addEventListener('click', closeHandler);

    messageContainer.appendChild(closeButton);

    return messageContainer;
};

/**
 * @param {String} message
 */
const injectErrorInPopup = (message) => {
    if (!document.body.querySelector('#atol-jdds-popup-error')) {
        const messageContainer = createAlert(message, 'error');
        document.body.appendChild(messageContainer);
    }
};

/**
 * @param {String} message
 */
const injectWarningInPopup = (message) => {
    if (!document.body.querySelector('#atol-jdds-popup-warning')) {
        const messageContainer = createAlert(message, 'warning');
        document.body.appendChild(messageContainer);
    }
};

const actions = {
    /**
     * @param {MouseEvent} e
     */
    insert_nd: (e) => {
        e.preventDefault();
        e.stopPropagation();

        (async () => {
            try {
                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                const command = 'insert_nd_in_page';
                const { target } = e;
                const nd = target.innerText;
                const { id: tabId } = tabs[0];

                await browser.tabs.sendMessage(tabId, { command, nd });
            } catch (e) {
                injectErrorInPopup(`Injection du nd impossible car la connection à la page web à échoué`);
                console.error(`Injection du nd impossible`, e);
            }
        })();
    },

    /**
     * @param {MouseEvent} e
     */
    insert_email: (e) => {
        e.preventDefault();
        e.stopPropagation();

        (async () => {
            try {
                const { target } = e;
                const command = 'ident_with_email_and_password';
                const email = target.innerText;
                const password = target.parentElement.nextElementSibling.innerText;

                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                const { id: tabId } = tabs[0];

                browser.tabs.sendMessage(tabId, { command, email, password });
            } catch (e) {
                injectErrorInPopup(`Injection de l'email ou du mot de passe impossible car la connection à la page web à échoué`);
                console.error(`injection de l'email ou du mot de passe impossible`, e);
            }
        })();
    },

    /**
     * @param {MouseEvent} e
     */
    back_to_home: (e) => {
        e.preventDefault();
        e.stopPropagation();

        (async () => {
            try {
                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                const command = 'back_to_home';
                const { id: tabId } = tabs[0];

                browser.tabs.sendMessage(tabId, { command });
            } catch (e) {
                console.error(`retour à l'accueil impossible`);
            }
        })();
    }
};

/* ** ****************************************************************** ** */
/* ** INITIALISATION DU TABLEAU DE JDDS ******************************** ** */
/* ** ****************************************************************** ** */

(initializeJDDTable = async () => {
    Loader.create();

    const r = await (Promise.all([
        getJdds(),
        getTypes(),
        getEnvironments()
    ]).then(r => ({
        jdds: r[0],
        types: r[1],
        environments: r[2]
    })));

    const { jdds, environments, types } = r;

    document.querySelector('.environments-list').innerHTML = environments
        .map((e) =>
            `<th data-target="${e}" class="tab"> ${e.toUpperCase()} </th>`
        ).join('\n');

    document.querySelector('.types-list').innerHTML = types
        .map((e) =>
            `<div data-target="${e}" class="sub-tab"> ${e.toUpperCase()} </div>`
        ).join('\n');

    document.querySelector('.contents-container').innerHTML = '';

    for (const platform of environments) {
        document.querySelector('.contents-container').innerHTML += `
        <tr>
            <td colspan="4">
                <div class="${platform}-tab-content tab-content">
                    ${jdds[platform].length === 0 
                        ? `Aucun JDD pour la ${platform}` 
                            : types.map(t => `
                                <table data-type="${t}" style="width: 100%;">
                                    <thead>
                                        <tr>
                                            <th> ND </th>
                                            <th> EMAIL </th>
                                            <th> MDP </th>
                                            <th> CAS </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${jdds2HtmlArray(jdds[platform], t.toUpperCase()) === '' ? `<tr>
                                            <td colspan="4"> Il n'y a aucun JDD de ce type </td>
                                        </tr>` : jdds2HtmlArray(jdds[platform], t.toUpperCase())}
                                    </tbody>
                                </table>
                            `).join('\n')}
                </div>
            </td>
        </tr>`;
    }

    Loader.remove();
})().then(() => {

    /* ** ****************************************************************** ** */
    /* ** INITIALISATION DES ONGLETS *************************************** ** */
    /* ** ****************************************************************** ** */

    /**
     * @type {Array<Element>}
     */
    const [tabs, subTabs] = (initializeTabs = () => {
        const tabs = document.querySelectorAll('.tab');
        const subTabs = document.querySelectorAll('.sub-tab');

        /**
         * @param {Function|null} getActiveTabId
         * @param {String} env
         */
        (initPlatforms = (getActiveTabId = null, env = 'not-atol') => {
            let id = 0;
            let activeTabId = Array.from(tabs).reduce((r, c) => {
                if (!c.classList.contains('active')) {
                    id++;
                    return r;
                }
                return id;
            }, 0);

            if (getActiveTabId !== null) {
                let _activeTabId = getActiveTabId(env);

                if (_activeTabId !== null) {
                    activeTabId = _activeTabId;
                }
            }

            Array.from(tabs).map(t => {
                t.classList.remove('active');
                document.querySelector(`.${t.getAttribute('data-target')}-tab-content`)?.classList.remove('active')
            });

            const activeTab = tabs[activeTabId];
            activeTab.classList.add('active');
            document.querySelector(`.${activeTab.getAttribute('data-target')}-tab-content`).classList.add('active');
        })();

        (initTypes = (getActiveTabId = null, type = subTabs[0]?.getAttribute('data-target')) => {
            let id = 0;
            let activeTabId = Array.from(subTabs).reduce((r, c) => {
                if (!c.classList.contains('active')) {
                    id++;
                    return r;
                }
                return id;
            }, 0);

            if (getActiveTabId !== null) {
                let _activeTabId = getActiveTabId(env);

                if (_activeTabId !== null) {
                    activeTabId = _activeTabId;
                }
            }

            Array.from(subTabs).map(t => {
                t.classList.remove('active');
                document.querySelector(`[data-type]`)?.classList.remove('active')
            });

            const activeTab = subTabs[activeTabId];
            activeTab.classList.add('active');
            document.querySelector(`[data-type="${type}"]`)?.classList.add('active');
        })();

        document.querySelector('#popup_types .sub-tab').classList.add('active');

        browser.runtime.onMessage.addListener((request) => {
            if (request.environment) {
                const {environment: env} = request;

                Loader.create();

                initPlatforms(() => {
                    switch (env) {
                        case 'dev':
                        case 'rec':
                        case 'preprod':
                        case 'prod':
                            global.env = env;
                            let id = 0;
                            return Array.from(tabs).reduce((r, c) => {
                                if (c.getAttribute('data-target') !== env) {
                                    id++;
                                    return r;
                                }
                                return id;
                            }, 0);
                        default:
                            global.env = 'no-env';
                            injectWarningInPopup('Aucun environnement détécté, vous êtes probablement hors du projet ATOL.');
                            return null;
                    }
                }, env);

                Loader.remove();

                console.log('environment: ', env)
            }
        });

        return [Array.from(tabs), Array.from(subTabs)];
    })();

    tabs.map(
        /**
         * @param {Element} t
         */
        t => t.addEventListener('click', () => setNewActiveTab(t, subTabs)));

    subTabs.map(
        /**
         * @param {Element} t
         */
        t => t.addEventListener('click', () => setNewActiveSubTab(t)));

    /* ** ****************************************************************** ** */
    /* ** PROGRAMME PRINCIPAL ********************************************** ** */
    /* ** ****************************************************************** ** */

    /**
     * When the popup loads, inject a content script into the active tab,
     * and add a click handler.
     * If we couldn't inject the script, handle the error.
     */
    browser.tabs.executeScript({file: "/assets/js/content_script.js"}).then(() => {
        document.addEventListener('click', (e) => {
            const { target } = e;
            const action = target.getAttribute('data-command');
            if (action) {
                const actionToCall = action.replace(/-/g, '_');

                if (actionToCall in actions) actions[actionToCall](e);
            }
        });
    }).catch(e => {
        console.error(e);
    });

    /* ** ****************************************************************** ** */
    /* ** ECOUTE D'UN MESSAGE VENANT DU SCRIPT DE CONTENU ****************** ** */
    /* ** ****************************************************************** ** */

});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.error) {
        const { error } = request;

        injectErrorInPopup(error);

        console.error('error: ', error)
    }
});
