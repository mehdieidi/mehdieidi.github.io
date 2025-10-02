// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-bio",
    title: "Bio",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "Blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-bookshelf",
          title: "Bookshelf",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/books/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "books-c-how-to-program",
          title: 'C How to Program',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/c_how_to_program/";
            },},{id: "books-core-java-volume-i-fundamentals",
          title: 'Core Java Volume I--Fundamentals',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/core_java/";
            },},{id: "books-digital-design",
          title: 'Digital Design',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/digital_design/";
            },},{id: "books-discrete-and-combinatorial-mathematics",
          title: 'Discrete and Combinatorial Mathematics',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/discrete_math/";
            },},{id: "books-computer-organization-and-design-mips-edition-the-hardware-software-interface",
          title: 'Computer Organization and Design MIPS Edition: The Hardware/Software Interface',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/computer_organization/";
            },},{id: "books-data-structures-and-algorithms-in-java",
          title: 'Data Structures and Algorithms in Java',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/data_structures/";
            },},{id: "books-introduction-to-the-design-and-analysis-of-algorithms",
          title: 'Introduction to the Design and Analysis of Algorithms',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/algorithm/";
            },},{id: "books-an-introduction-to-formal-languages-and-automata",
          title: 'An Introduction to Formal Languages and Automata',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/automata/";
            },},{id: "books-database-system-concepts",
          title: 'Database System Concepts',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/database/";
            },},{id: "books-compilers-principles-techniques-and-tools",
          title: 'Compilers: Principles, Techniques, and Tools',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/compiler/";
            },},{id: "books-linux-system-programming",
          title: 'Linux System Programming',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/linux_programming/";
            },},{id: "books-computer-networking-a-top-down-approach",
          title: 'Computer Networking: A Top-Down Approach',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/networks/";
            },},{id: "books-operating-system-concepts",
          title: 'Operating System Concepts',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/os/";
            },},{id: "books-systems-analysis-and-design",
          title: 'Systems Analysis and Design',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/systems_design/";
            },},{id: "books-artificial-intelligence-a-modern-approach",
          title: 'Artificial Intelligence: A Modern Approach',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/ai/";
            },},{id: "books-cryptography-and-network-security-principles-and-practice",
          title: 'Cryptography and Network Security: Principles and Practice',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/cryptography/";
            },},{id: "books-introduction-to-information-retrieval",
          title: 'Introduction to Information Retrieval',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/information_retrieval/";
            },},{id: "books-concepts-of-programming-languages",
          title: 'Concepts of Programming Languages',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/programming_languages/";
            },},{id: "books-software-engineering-a-practitioner-39-s-approach",
          title: 'Software Engineering: A Practitioner&amp;#39;s Approach',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/se/";
            },},{id: "books-mda-distilled-principles-of-model-driven-architecture",
          title: 'MDA Distilled: Principles of Model-Driven Architecture',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/mda_distilled/";
            },},{id: "books-serverless-development-on-aws-building-enterprise-scale-serverless-solutions",
          title: 'Serverless Development on AWS: Building Enterprise-Scale Serverless Solutions',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/serverless_development_on_aws/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%6D%65%68%64%69%61%64%71@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/mehdieidi", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/mehdieidi", "_blank");
        },
      },{
        id: 'social-medium',
        title: 'Medium',
        section: 'Socials',
        handler: () => {
          window.open("https://medium.com/@mehdieidi", "_blank");
        },
      },];
