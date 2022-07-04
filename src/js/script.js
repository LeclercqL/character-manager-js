import * as bootstrap from 'bootstrap';
import tinymce from 'tinymce';

// A theme is also required
import 'tinymce/themes/silver/theme';
import 'tinymce/models/dom';
import 'tinymce/icons/default';
import 'tinymce/plugins/lists';

// npm run start pour lancer le serveur au démarrage :p
const axios = require('axios');
const section_list = document.querySelector('#js-list-char');
const section_form = document.querySelector('#js-form-char');
const section_detail = document.querySelector('#js-view-char');

const signatures = {
    JVBERi0: "application/pdf",
    R0lGODdh: "image/gif",
    R0lGODlh: "image/gif",
    iVBORw0KGgo: "image/png",
    "/9j/": "image/jpg"
};

const getCharacters = async (search,type) => {
    let url = 'https://character-database.becode.xyz/characters';
    if(search != '' && type != '') {
        if (type == 'name') {
            url += '?name='+search;
        } else if (type == 'id') {
            url += '/'+search;
        }
    }

    const response = await axios.get(url);
    const { data, status } = response;

    const listChar = document.querySelector('[data-template="list-char"]');
    const listCharClone = listChar.content.cloneNode(true);
    section_list.appendChild(listCharClone);

    //On regarde si on a 1 seul resultat 
    let characters = [];
    if (type == 'id') {
        characters[0] = data;
    } else { 
        data.forEach((item) => {
            characters.push(item);
        });
    }

    if (characters.length == 0) {
        document.getElementById("js-no-results").style.display = 'block';
    } else {
        document.getElementById("js-no-results").style.display = 'none';
    } 

    characters.forEach((item) => {
        if (item.name != 'null' && item.name != 'undefined') {
            const idChar = item.id;
            const name = item.name;
            const img = item.image;
            const shortDescription = item.shortDescription;
            const article = document.createElement("article");
            article.classList.add('col-12','col-sm-6','col-md-4','col-lg-3','mb-3');
            const cards = document.querySelector(".cards");
            let markup = `
                <div class="card">
                    <img class="card-img-top" src="data:image/gif;base64,${img}">
                    <div class="card-body">
                        <h2 class="card-title h4">${name}</h2>
                        <p class="card-text">${shortDescription}</p>
                        <div class="d-flex justify-content-between">
                            <button type="button" data-id="${idChar}" class="js-open-detail btn btn-primary">View detail</a>
                            <button type="button" data-id="${idChar}" class="js-edit-char btn btn-dark">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            article.innerHTML = markup;
            cards.appendChild(article);

            document.querySelector(`.js-open-detail[data-id="${idChar}"]`).addEventListener('click', () => {
                const state = { 'page': 'view', 'id' : idChar }
                const url = 'view';
                history.replaceState(state, '', url);
                
                viewCharacter(idChar);
            });

            document.querySelector(`.js-edit-char[data-id="${idChar}"]`).addEventListener('click', () => {
                viewCharacterForm(idChar);
            });
        }
    });
}

const getCharacter = async (id) => {
    const response = await axios.get('https://character-database.becode.xyz/characters/'+id)
    .catch((error) => {
        axiosError();
    });

    if(typeof response != 'undefined') {
        const { data, status } = response;
        const viewChar = document.querySelector('[data-template="view-char"]');
        const viewCharClone = viewChar.content.cloneNode(true);
        section_detail.appendChild(viewCharClone);
        
        for (const [key, value] of Object.entries(data)) {
            if(value != '') {
                if(key == 'id') {
                    document.querySelector(`#js-char-${key}`).value = value;
                } else if(key == 'image') {
                    const type = detectMimeType(value);
                    const url = `data:${type};base64,${value}`;
                    document.querySelector(`#js-char-${key}`).setAttribute('src',url);
                } else {
                    document.querySelector(`#js-char-${key}`).innerHTML = value;
                }
            }
        }
        initDeleteForm();
        initBackToList();
    }
}

const saveCharacter = async (form) => {
    form.preventDefault();
    const formType = form.target.getAttribute('data-type');
    const formData = new FormData(form.target); // = new FormData(document.forms['form-char']); ou new FormData(document.querySelector('form[name="form-char"]'))
    const formProps = Object.fromEntries(formData);
    let image = await getBase64(formProps.image);
    image = image.replace(`data:${formProps.image.type};base64,`,``);
    let response;
    let alertMsg = '';

    const data = {
        name: formProps.name,
        shortDescription: formProps.shortDescription,
        image: image,
        description: formProps.description
    };

    if(formType == 'edit') {
        //On recupere l'id du personnage
        const idChar = document.getElementById('js-id-char').value;

        //On verifie si on a mis une nouvelle image sinon on garde l'ancienne
        if(formProps.image.size == 0) {
            data.image = document.querySelector('#js-form-image').getAttribute('data-uri');
        } 

        response = await axios.put('https://character-database.becode.xyz/characters/' + idChar,data)
        .catch((error) => {
            axiosError();
        });

        alertMsg = `Your character ${data.name} is update !`;
    } else {
        response = await axios.post('https://character-database.becode.xyz/characters',data)
        .catch((error) => {
            axiosError();
        });
        alertMsg = `Your new character ${data.name} is created !`;
    }

    //On test si la reponse est reussi
    if(typeof response != 'undefined') {
        if(alertMsg != '') {
            alertMessage(alertMsg,'success');
        }
        viewCharacterList();
        getCharacters();
    }
}

const axiosError = (error) =>  {
    if(error.response.status == 413) {
        alertMessage('Request is too large, maybe your image need to be resize down');
    } else {
        alertMessage(error.response.data.message);
    }
}

const getCharacterForm = async (id) => {
    const formChar = document.querySelector('[data-template="form-char"]');
    const formCharClone = formChar.content.cloneNode(true);
    section_form.appendChild(formCharClone);

    const cardImage = document.getElementById('js-card-image');
    const inputImage = document.getElementById('js-input-image');
    initBackToList();
    initSaveForm();
    tinymce.init({
        selector: '#description',
        themes: 'modern',
        plugins: 'lists',
        toolbar: 'undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist checklist | forecolor backcolor removeformat | emoticons | fullscreen | link anchor codesample',
    });

    if(id != '') {
        document.forms['form-char'].setAttribute('data-type','edit');
        document.getElementById('js-id-char').value = id;
        const response = await axios.get('https://character-database.becode.xyz/characters/'+id)
        .catch((error) => {
            if(error.code == 'ERR_BAD_REQUEST') {
                alertMessage('Request is too large, maybe your image need to be resize down');
            }
        });

        if(typeof response != 'undefined') {
            const { data, status } = response;
            
            for (const [key, value] of Object.entries(data)) {
                if(key == 'image') {
                    const type = detectMimeType(value);
                    const url = `data:${type};base64,${value}`;
                    document.querySelector(`#js-form-image`).setAttribute('src',url);
                    document.querySelector(`#js-form-image`).setAttribute('data-uri',value);
                } else if(key != 'id') {
                    document.querySelector(`[name=${key}]`).value = value;
                }
            }
            hideInputFile(cardImage,inputImage);
    
            document.querySelector('#js-show-input').addEventListener('click', (e) => {
                e.preventDefault();
                showInputFile(cardImage,inputImage); 
            });
        }
    } else  {
        showInputFile(cardImage,inputImage);
    }
}

const hideInputFile = (card,input) => {
    card.style.display = 'block';
    input.style.display = 'none';
    input.querySelector('input').removeAttribute('required');
}

const showInputFile = (card,input) => {
    card.style.display = 'none';
    input.style.display = 'block';
    input.querySelector('input').setAttribute('required','');
}

const removeChar = async (form) => {
    form.preventDefault();
    const formData = new FormData(form.target); // = new FormData(document.forms['form-char']); ou new FormData(document.querySelector('form[name="form-char"]'))
    const formProps = Object.fromEntries(formData);

    const response = await axios.delete('https://character-database.becode.xyz/characters/' + formProps.idChar)
    .catch((error) => {
        if(error.code == 'ERR_BAD_REQUEST') {
            alertMessage('Request is too large, maybe your image need to be resize down');
        }
    });

    //On test si la reponse est reussi
    if(typeof response != 'undefined') {
        alertMessage('Character removed !','success');
        viewCharacterList();
        getCharacters();
    }
}


const viewCharacterForm = (id = '') => {
    const charForm = document.querySelector('#js-form-template');
    if(charForm !== null) {
        document.querySelector('#js-form-template').remove();
    }

    section_list.style.display = 'none';
    section_form.style.display = 'block';
    section_detail.style.display = 'none';
    getCharacterForm(id);
}

const viewCharacter = (id) => {
    const charDetail = document.querySelector('#js-char-template');
    if(charDetail !== null) {
        document.querySelector('#js-char-template').remove();
    }

    section_list.style.display = 'none';
    section_form.style.display = 'none';
    section_detail.style.display = 'block';
    getCharacter(id);
}

const viewCharacterList = (search = '',type = '') => {
    const charList = document.querySelector('#js-charList-template');
    if(charList !== null) {
        document.querySelector('#js-charList-template').remove();
    }
    
    getCharacters(search,type);
    section_list.style.display = 'block';
    section_form.style.display = 'none';
    section_detail.style.display = 'none';
}

const searchChar = (form) => {
    form.preventDefault();
    const searchValue = document.getElementById('js-search-input').value;
    let type = 'name';
    
    //On verifie si la recherche est un UUID (https://www.fwait.com/how-to-check-if-string-is-a-uuid-in-javascript/)
    let pattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    if(searchValue.match(pattern)) {
       type = 'id'; 
    }

    viewCharacterList(searchValue,type);
}

const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
  
const detectMimeType = (b64) => {
    for (var s in signatures) {
        if (b64.indexOf(s) === 0) {
            return signatures[s];
        }
    }
}

const alertMessage = (message,alertType = 'danger') =>  {
    const alertBlock = document.createElement("div");
    alertBlock.classList.add(`alert`,`alert-${alertType}`,'position-fixed','top-2','end-2');
    alertBlock.style.zIndex = 1090;
    const errMsg = document.createTextNode(message);
    alertBlock.appendChild(errMsg);
    document.body.appendChild(alertBlock);

    setTimeout(()=>  {
        alertBlock.remove();
    },5000);
}

const initBackToList = () => {
    const backList = document.querySelectorAll('.js-back-list');
    backList.forEach((item) => {
        item.addEventListener('click', () => {
            const state = { 'page': 'list' }
            const url = ''
            history.replaceState(state, '', url);
            viewCharacterList();
        });
    });
}

const initDeleteForm = () => {
    document.forms['remove-char'].addEventListener('submit', (e) => {
        removeChar(e);
    });
}

const initSaveForm = () => {
    document.forms['form-char'].addEventListener('submit', (e) => {
        tinymce.triggerSave();
        saveCharacter(e);
    });
}


document.querySelector('#js-add-char').addEventListener('click', () => {
    const state = { 'page': 'add' }
    const url = 'add'
    history.replaceState(state, '', url);

    viewCharacterForm();
});

document.forms['form-search'].addEventListener('submit', (e) => {
    searchChar(e);
});


window.onpopstate = history.onpushstate = function(e) { 
    if(history.state != null)  { 
        switch(history.state.page) {
            case 'add' :
                viewCharacterForm();
                break;
            case 'view' :
                viewCharacter(history.state.id);
            default :
                viewCharacterList();
                break;
        }
    }
}
/* TODO : Historique a terminer
window.onload = function() { 
    if(history.state != null)  { 
        switch(history.state.page) {
            case 'add' :
                viewCharacterForm();
                break;
            case 'view' :
                viewCharacter(history.state.id);
            default :
                viewCharacterList();
                break;
        }
    }
}*/

viewCharacterList();