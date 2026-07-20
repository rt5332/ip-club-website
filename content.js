(function () {
  const STORAGE_KEY = "hsipa-site-content-v1";
  const defaults = {
    showChapters: false,
    partners: [
      {
        id: "usfpa",
        name: "USFPA",
        description: "Student-facing programming and innovation education.",
        url: "",
        logo: ""
      },
      {
        id: "illinois",
        name: "Illinois",
        description: "Regional education, outreach, and chapter-building support.",
        url: "",
        logo: ""
      },
      {
        id: "ip-alliance",
        name: "Intellectual Property Alliance",
        description: "Broader IP awareness, policy education, and professional connection.",
        url: "",
        logo: ""
      },
      {
        id: "ijcs",
        name: "Illinois Junior Catholic Science",
        description: "Science education collaboration for students pursuing research and invention.",
        url: "",
        logo: ""
      },
      {
        id: "uspto",
        name: "USPTO",
        description: "Public intellectual property resources that help students understand the national system.",
        url: "https://www.uspto.gov/",
        logo: ""
      }
    ],
    team: [
      {
        id: "arnav",
        name: "Arnav",
        role: "Founder and chapter lead",
        bio: "Leads the Stevenson founding chapter and the national launch of HSIPA, helping students turn IP awareness into practical action.",
        url: "mailto:arnav.chaphalkar@gmail.com",
        photo: ""
      },
      {
        id: "artie-chappeler",
        name: "Artie Chappeler",
        role: "Founding team",
        bio: "Supports chapter outreach, student programming, and the framework schools use to build serious student-led IP organizations.",
        url: "",
        photo: ""
      }
    ],
    chapters: [
      {
        id: "stevenson",
        school: "Adlai E. Stevenson High School",
        state: "Illinois",
        leader: "Arnav",
        description: "Founding HSIPA chapter and the first working model for student-led IP awareness, education, and outreach.",
        contactEmail: "arnav.chaphalkar@gmail.com",
        url: "",
        actionLabel: "Contact this chapter"
      }
    ]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return clone(defaults);

      const content = {
        ...clone(defaults),
        ...saved,
        partners: Array.isArray(saved.partners) ? saved.partners : clone(defaults.partners),
        team: Array.isArray(saved.team) ? saved.team : clone(defaults.team),
        chapters: Array.isArray(saved.chapters) ? saved.chapters : clone(defaults.chapters)
      };

      content.team = content.team.map((member) => ({
        ...member,
        url: String(member.url || "").replace(/arnav@iclubs\.org/gi, "arnav.chaphalkar@gmail.com")
      }));
      content.chapters = content.chapters.map((chapter) => {
        const original = defaults.chapters.find((item) => item.id === chapter.id) || {};
        return { ...original, ...chapter };
      });
      return content;
    } catch {
      return clone(defaults);
    }
  }

  function save(content) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return clone(defaults);
  }

  window.HSIPAContent = { defaults: clone(defaults), load, save, reset };
})();
