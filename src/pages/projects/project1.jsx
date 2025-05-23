// import { useParams } from "react-router";
import { projectsData } from "../../utlits/fackData/projectData";

const Project1 = () => {
  const id = 1
  const project = projectsData.find((proj) => proj.id === parseInt(id));

  return (
    <div class="single-project-page-design">
      <div class="container">
        <div class="row">
          <div class="col-lg-12 text-center pb-30">
            <p>{project.title}</p>
            <h1>{project.bname}</h1>
          </div>
        </div>
      </div>
      <div class="single-project-image">
        {/* <img src={singleProjectImg} alt="image" /> */}
        <video autoPlay muted loop>
          <source src={`/projects/${id}/banner.mp4`} type="video/mp4" />
        </video>
      </div>
      <div class="container pt-30">
        <div class="row">
          <div class="col-lg-4">
            {/* <!-- START SINGLE LEFT DESIGN AREA --> */}
            <div class="single-project-page-left wow fadeInUp delay-0-2s">
              <div class="single-info">
                <p>Year</p>
                <h3>{project.year}</h3>
              </div>
              <div class="single-info">
                <p>Client</p>
                <h3>{project.client}</h3>
              </div>
              <div class="single-info">
                <p>Services</p>
                <h3>{project.service}</h3>
              </div>
              <div class="single-info">
                <p>Project</p>
                <h3>{project.project}</h3>
              </div>
            </div>
            {/* <!-- / END SINGLE LEFT DESIGN AREA --> */}
          </div>
          {/* <!-- START SINGLE RIGHT DESIGN AREA --> */}
          <div class="col-lg-8">
            <div class="single-project-page-right wow fadeInUp delay-0-4s">
              <h2>Description</h2>
              <p>{project.description}</p>
              {/* <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit utsadi sfejdis aliquam, purus sit amet luctus venenatis, lectus magna sansit trandis fringilla urna, porttitor rhoncus dolor purus non enim dollors praesent tabasi elementum facilisis leo.</p> */}
              {/* <p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable sourc consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.</p> */}
            </div>
          </div>
          {/* <!-- / END SINGLE RIGHT DESIGN AREA --> */}
        </div>
        {/* <!-- START SINGLE PAGE GALLERY DESIGN AREA --> */}
        <div class="row pt-30">
          <div class="col-lg-6">
            <div class="single-image wow fadeInUp delay-0-2s">
              <img src={`/projects/${id}/artboard1.png`} alt="gallery" />
            </div>
          </div>
          <div class="col-lg-6">
            <div class="single-image wow fadeInUp delay-0-4s">
              <img src={`/projects/${id}/artboard2.png`} alt="gallery" />
            </div>
          </div>
          <div class="col-lg-6">
            <div class="single-image wow fadeInUp delay-0-6s">
              <img src={`/projects/${id}/artboard3.png`} alt="gallery" />
            </div>
          </div>
          <div class="col-lg-6">
            <div class="single-image wow fadeInUp delay-0-8s">
              <img src={`/projects/${id}/artboard4.png`} alt="gallery" />
            </div>
          </div>
        </div>
        {/* <!--  / END SINGLE PAGE GALLERY DESIGN AREA --> */}
      </div>
    </div>
  );
};

export default Project1;
