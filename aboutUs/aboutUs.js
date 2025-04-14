document.addEventListener('DOMContentLoaded', () => {
    // Selecciona todos los elementos que tienen la clase "animated"
    const animatedElements = document.querySelectorAll('.animated');

    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fadeInUp');
                // Una vez animado, se deja de observar
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Ejemplo adicional: cambiar el fondo de los párrafos de "Nuestra Historia" al pasar el mouse
    const paragraphs = document.querySelectorAll('.about-us p');
    paragraphs.forEach(p => {
        p.addEventListener('mouseover', () => {
            p.style.backgroundColor = '#f0f0f0';
        });
        p.addEventListener('mouseout', () => {
            p.style.backgroundColor = 'transparent';
        });
    });
});