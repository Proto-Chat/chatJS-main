function createImage(buf) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(new Blob([buf]));
    img.width = '250';

    img.onload = () => {
        const msgs = document.getElementById('messages');
        const imgs = msgs.querySelectorAll('img');

        // scrollIntoView({ behavior: 'smooth' });
        imgs[imgs.length - 1].scrollIntoView();
    }

    return img;
}