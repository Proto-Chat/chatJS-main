function createImage(buf) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(new Blob([buf]));
    img.width = '250';
    return img;
}