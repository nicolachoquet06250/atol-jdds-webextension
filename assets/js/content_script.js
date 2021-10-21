(() => {
    /* ** ****************************************************************** ** */
    /* ** FONCTIONS DE RECUPERATION DE L'ENVIRONEMENT ********************** ** */
    /* ** ****************************************************************** ** */

    /**
     * @param {String} str
     * @param {RegExp} regex
     */
    let getMatches = (str, regex) => {
        let m;
        const matches = [];

        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                matches.push({
                    groupIndex,
                    match
                });
            });
        }

        return matches;
    };

    let getEnvironment = () => {
        const matchesOutOfProd = getMatches(`${window.location.protocol}//${window.location.hostname}`, /https:\/\/(classic-)?(dev|rec|preprod)-fea.staging.orange.fr/g);
        const matchesProd = getMatches(`${window.location.protocol}//${window.location.hostname}`, /https:\/\/tester-depanner-vos-services.orange.fr/g);

        if (matchesOutOfProd.length > 0) {
            return matchesOutOfProd[2].match;
        } else if (matchesProd.length > 0) {
            return 'prod';
        }
        return 'not-atol';
    };

    /* ** ****************************************************************** ** */
    /* ** ENVOIE DE L'ENVIRONNEMENT AU SCRIPT DE LA POPUP ****************** ** */
    /* ** ****************************************************************** ** */

    browser.runtime.sendMessage({ environment: getEnvironment() });

    /* ** ****************************************************************** ** */
    /* ** VERIFICATION ET INITIALISATION D'UNE VARIABLE GLOBALE ************ ** */
    /* ** POUR S'ASSURER QUE LE SCRIPT NE S'EXECUTE Q'UNE SEULE FOIS ******* ** */
    /* ** ****************************************************************** ** */

    if (window.hasRun) return;
    window.hasRun = true;

    const wassup = {
        dev: (email, password) => `https://tb2n1.orange.fr/WT/auth/?wt-email=${encodeURI(email)}&wt-pwd=${encodeURI(password)}&wt-mco=MCO=OFR`,
        rec: (email, password) => `https://tb2n1.orange.fr/WT/auth/?wt-email=${encodeURI(email)}&wt-pwd=${encodeURI(password)}&wt-mco=MCO=OFR`,
        preprod: (email, password) => `https://sso.orange.fr/WT/auth/?wt-email=${encodeURI(email)}&wt-pwd=${encodeURI(password)}&wt-mco=MCO=OFR`,
        prod: (email, password) => `https://sso.orange.fr/WT/auth/?wt-email=${encodeURI(email)}&wt-pwd=${encodeURI(password)}&wt-mco=MCO=OFR`
    };

    /* ** ****************************************************************** ** */
    /* ** DEFINITION DES FONCTIONS ***************************************** ** */
    /* ** ****************************************************************** ** */

    const isOrangeDomain = () => window.location.hostname.indexOf('.orange.fr') !== -1 || window.location.hostname.indexOf('.orange.com') !== -1;

    /**
     * @param {Record<string, string|boolean>} object
     */
    const objectToQueryString = (object) =>
        Object.keys(object).reduce((r, c) => {
            if (r === '') {
                return `?${object[c] === true ? c : `${c}=${object[c]}`}`;
            } else {
                return `${r}&${object[c] === true ? c : `${c}=${object[c]}`}`;
            }
        }, '');

    /* ** ****************************************************************** ** */
    /* ** DEFINITION DES ACTIONS ******************************************* ** */
    /* ** ****************************************************************** ** */

    const actions = {
        back_to_home: () => {
            window.location.href = `/${objectToQueryString({ page: 'accueil', authentagain: true })}`
        },
        insert_nd_in_page: (message) => {
            const phoneInput = document.querySelector('input[type="tel"]');

            if (phoneInput) {
                phoneInput.value = message.nd;
                phoneInput.classList.add('is-valid');
                phoneInput.classList.remove('form-control-empty');

                const validationButton = document.querySelector('.atol-home-btn');

                if (validationButton) {
                    validationButton.click();
                }
            }
        },
        ident_with_email_and_password: (message) => {
            const environment = getEnvironment();

            if (environment !== 'not-atol') {
                fetch(wassup[environment](message.email, message.password))
                    .then(r => r.text())
                    .then(() => {
                        window.location.href = '/?page=accueil';
                    })
            }
        }
    };

    /* ** ****************************************************************** ** */
    /* ** SCRIPT PRINCIPAL ************************************************* ** */
    /* ** ****************************************************************** ** */

    /**
     * On écoute les messages du script de la popup pour
     * déclencher les différentes action à éféctuer sur la page.
     */
    browser.runtime.onMessage.addListener((message) => {
        if (isOrangeDomain()) {
            if (message.command in actions) actions[message.command](message);
        } else {
            // ENVOIE D'UNE ERREUR AU SCRIPT DE LA POPUP CAR LA PAGE COURANTE N'APPARTIENT PAS A ORANGE.
            browser.runtime.sendMessage({ error: `Cette page n'appartient pas au domaine orange.fr` });
        }
    });
})();
