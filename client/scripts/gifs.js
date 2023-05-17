async function getGif(search_term = null, id = null, preview = true) {
    return new Promise((resolve) => {
        // set the apikey and limit
        const apikey = "LIVDSRZULELA";
        const lmt = 1;

        // using default locale of en_US
        var search_url;
        if (search_term) {
            search_url = `https://g.tenor.com/v1/search?q=${search_term}&key=${apikey}&limit=${lmt}`;
        } else {
            if (!id) return;
            search_url = `https://g.tenor.com/v1/gifs?ids=${id}&key=${apikey}&media_filter=basic`;
        }

        // create the request object
        var xmlHttp = new XMLHttpRequest();

        // set the state change callback to capture when the response comes in
        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                // parse the json response
                var response_objects = JSON.parse(xmlHttp.responseText);
                const gif = response_objects["results"][0];

                if (preview) resolve({url: gif["media"][0]["nanomp4"]["url"], id: gif.id})
                else resolve({url: gif["media"][0]["gif"]["url"]});
            }
        }

        // open as a GET call, pass in the url and set async = True
        xmlHttp.open("GET", search_url, true);

        // call send with no params as they were passed in on the url string
        xmlHttp.send(null);
    });
}


function createGIF(srcObj) {
    const element = document.createElement('video');
    element.autoplay = true;
    element.loop = true;
    element.muted = true;
    element.src = srcObj.url;
    element.id = srcObj.id;
    element.innerText = srcObj.url;
    element.width = '200';
    element.style.display = 'flex';
    element.style.marginTop = '3px';

    return element;
}


function createGifForPopup(gifRaw) {
    const el = document.createElement('video');
    el.src = gifRaw.media[0].nanomp4.url;
    el.id = gifRaw.id;
    el.width = "175";
    el.autoplay = true;
    el.loop = true;
    el.muted = true;

    el.onclick = (e) => {
        sendGif(e.target);
    }

    return el;
}

/**
 * "searchterm": "why",
 * "path": "https://g.tenor.com/v1/search?tag=why&locale=en&key=LIVDSRZULELA",
 * "image": "https://media.tenor.com/tDQXUq-HakUAAAAM/why-just-why.gif",
 * "name": "#why"
 */
function createCategoryGif(rawGifObj, APIKey) {
    const overlayContainer = document.createElement('div');
    overlayContainer.style.position = 'relative';

    const el = document.createElement('img');
    el.src = rawGifObj.image;
    el.width = "175";
    el.alt = rawGifObj.searchterm;
    
    const overlaytxt = document.createElement('p');
    overlaytxt.className = 'gifcategoryoverlay';
    overlaytxt.innerText = rawGifObj.searchterm;
    overlaytxt.className = 'giftxtoverlay';
    
    el.onclick = (e) => {
        const url = `https://g.tenor.com/v1/search?tag=${e.target.alt}&locale=en&key=${APIKey}`
        const element = e.target.parentElement.parentElement;
        element.textContent = '';
        createGifCollectionDisplay(element, url);
    }

    overlayContainer.appendChild(el);
    overlayContainer.appendChild(overlaytxt);

    return overlayContainer;
}


function createGifPopup() {
    const element = document.createElement('div');
    element.className = 'gifpopup';
    const APIKey = 'LIVDSRZULELA';

    //Create searchbar
    const searchBar = document.createElement('input');
    searchBar.type = 'text';

    var keyUpTimer;
    searchBar.addEventListener('keypress', (e) => {
        if (e.code == 'Enter' || !searchBar.value) return;
        clearInterval(keyUpTimer);
        keyUpTimer = setInterval(() => {
            //get GIF
            const url = `https://g.tenor.com/v1/search?key=${APIKey}&q=${searchBar.value}&media_filter=basic`;
            e.target.parentElement.children[1].remove();
            const resultContainer = document.createElement('div');
            resultContainer.className = 'maincontent';
            resultContainer.textContent = '';
            
            createGifCollectionDisplay(resultContainer, url);
            element.appendChild(resultContainer);

            clearInterval(keyUpTimer);
        }, 1000);
    });

    element.appendChild(searchBar);


    //Create categories
    const url = `https://g.tenor.com/v1/categories?key=${APIKey}`;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            const response = JSON.parse(xmlHttp.responseText);
            const categoriesDiv = document.createElement('div');
            categoriesDiv.className = 'maincontent';

            for (const i in response.tags) {
                categoriesDiv.appendChild(createCategoryGif(response.tags[i], APIKey));
            }

            element.appendChild(categoriesDiv);
        }
    }

    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);

    window.addEventListener('mousedown', (e) => {
        if (!element.contains(e.target)) {
            element.remove();
        }
    })
    return element;
}

function createGifCollectionDisplay(resultContainer, url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            const response = JSON.parse(xmlHttp.responseText);

            for (const i in response.results) {
                resultContainer.appendChild(createGifForPopup(response.results[i]));
            }

            resultContainer.addEventListener('scroll', () => {
                if (resultContainer.offsetHeight + resultContainer.scrollTop >= resultContainer.scrollHeight) {
                    //maybe change this to an implementation that replaces the current div with the new one instead of just appending
                    var getNewGIFsReq = new XMLHttpRequest();
                    getNewGIFsReq.onreadystatechange = () => {
                        if (getNewGIFsReq.readyState == 4 && getNewGIFsReq.status == 200) {
                            const response = JSON.parse(getNewGIFsReq.responseText);

                            for (const i in response.results) {
                                resultContainer.appendChild(createGifForPopup(response.results[i]));
                            }
                        }
                    };

                    getNewGIFsReq.open("GET", url, true);
                    getNewGIFsReq.send(null);
                }
            });
        }
    };

    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}
