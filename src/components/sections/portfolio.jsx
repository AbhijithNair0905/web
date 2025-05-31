import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { RiArrowRightUpLine } from '@remixicon/react'
import { projectsData } from '../../utlits/fackData/projectData'
import SlideUp from '../../utlits/animations/slideUp';

const animations = ['slideIn', 'fadeIn', 'scaleUp'];

const getRandomAnimation = () => {
    const randomIndex = Math.floor(Math.random() * animations.length);
    return animations[randomIndex];
};

const Portfolio = ({ className }) => {
    const [category, setCategory] = useState('Branding');
    const [animationClass, setAnimationClass] = useState('');

    const handleCategoryClick = (item) => {
        setCategory(item)
        const randomAnimation = getRandomAnimation();
        setAnimationClass(randomAnimation);
    }

    // ------ filter unique category
    const filteredCategory = ["Branding"]
    projectsData.forEach(({ category }) => {
        if (!filteredCategory.includes(category)) {
            filteredCategory.push(category)
        }
    })
    // ------ filter unique category

    const filteredProjects = projectsData.filter(image => image.category === category);


    return (
        <section id="portfolio" className={`projects-area ${className}`}>
            <div className="container">
                <div className="container-inner">
                    <div className="row">
                        <div className="col-xl-12 col-lg-12">
                            <SlideUp>
                                <div className="section-title text-center">
                                    <h2>Works & Projects</h2>
                                    <p>Check out some of my design projects, meticulously crafted with love and dedication,
                                        each one reflecting the passion and soul I poured into every detail.</p>
                                </div>
                            </SlideUp>
                        </div>
                    </div>
                    <SlideUp>
                        <ul className="project-filter filter-btns-one justify-content-left pb-15">
                            {filteredCategory.map((item, id) => <li key={id} onClick={() => handleCategoryClick(item)} className={item === category ? "current" : ""}>{item}</li>)}
                        </ul>
                    </SlideUp>
                    <div className="row project-masonry-active overflow-hidden">  
                        {category === "Branding" && filteredProjects.map(({ category, id, title }) => <Card key={id} id={id} category={category} src={`/projects/${id}/thumbnail.png`} title={title} animationClass={animationClass} />)}
                        {category === "Animations" && filteredProjects.map(({ category, id, videoUrl, title }) => <VideoCard key={id} id={id} videoUrl={videoUrl} category={category} src={`/projects/${id}/thumbnail.png`} title={title} animationClass={animationClass} />)}
                        {category === "Reels" && filteredProjects.map(({ category, id, videoUrl, title }) => <VideoCard key={id} id={id} videoUrl={videoUrl} category={category} src={`/projects/${id}/thumbnail.png`} title={title} animationClass={animationClass} />)}
                        {category === "Posts" && filteredProjects.map(({ id, postId }) => <Photocard key={id} postId={postId} id={id} src={`/projects/socialMedia/posts/${postId}.jpg`} animationClass={animationClass} />)}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Portfolio


const Card = ({ category, title, src, animationClass, id }) => {
    return (
        <div className={`col-lg-4 col-md-6 item branding game ${animationClass}`}>
            <SlideUp delay={id}>
                <div className="project-item style-two">
                    <div className="project-image">
                        <img src={src} alt="Project" />
                        <Link to={`/project/${id}`} className="details-btn"><RiArrowRightUpLine /> </Link>
                    </div>
                    <div className="project-content">
                        <span className="sub-title">{category}</span>
                        <h3>{title}</h3>
                    </div>
                </div>
            </SlideUp>
        </div>
    )
}
const Photocard = ({ src, animationClass, id, postId }) => {
    return (
        <div className={`col-lg-4 col-md-6 item branding game ${animationClass}`}>
            <SlideUp delay={postId}>
                    <div className="project-image">
                        <img src={src} alt="Project" />
                    </div>
            </SlideUp>
        </div>
    )
}

// VideoCard component for videos from Cloudinary
const VideoCard = ({ category, title, videoUrl, animationClass, id }) => {
    return (
        <div className={`col-lg-4 col-md-6 item branding game ${animationClass}`}>
            <SlideUp delay={id}>
                    <div className="project-image">
                        <video
                            src={videoUrl}
                            autoPlay
                            muted
                            loop
                            poster=""
                            style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                        />
                    </div>
            </SlideUp>
        </div>
    )
}