## **Docker: A Simple Guide for Our Project Team**

### **The Big Problem Docker Solves**

We have all experienced the classic coding nightmare: you spend hours writing code, it runs perfectly on your laptop, but the moment your teaammate tries to run it on their machine, everything crashes.

This usually happens because of small differences between your computers. Maybe you have Node.js version 18 installed, but they have version 20. Maybe you are on a Mac and they are on Windows, or you have a specific database setting configured that they don't.

Docker solves this "but it works on my computer bro" problem completely. It ensures that our application runs exactly the same way on every single developer's machine, as well as on the server where we eventually deploy it.

### **What Exactly is Docker? (The Shipping Container Analogy)**

The easiest way to understand Docker is to think about real-world cargo ships. Before modern shipping containers existed, loading goods onto a ship was a chaotic puzzle. Workers had to pack barrels of oil, crates of electronics, and sacks of grain all together. It was slow, things got damaged, and different ships required different packing methods.

Then came the standardised shipping container. It didn't matter what was inside the container, the outside was always the exact same shape and size. It could easily fit onto any cargo ship, crane, or truck in the world.

#### **Docker does this for software.**

Instead of forcing your teammate to manually install databases, language tools, and libraries on their actual operating system, Docker packages your code and everything it needs to run into a digital "container." This container is completely isolated from the rest of the computer, meaning it brings its own environment along with it.

### **Why This Helps Us as Students**
- **Zero Setup Drama**: Instead of spending a bunch of meetings troubleshooting why someone's fronetnd won't run, libraries won't install, ect., we can use Docker to get everyone up and running in minutes.

- **No More Cluttered Laptops**: When this capstoe ends, we don't have to worry about random software, outdated libraries, or conflicting configurations cluttering up our laptops. We just delete the Docker container, and our computers remain clean.

- **Version Control for Environments**: If our project requires a specific version of a language (like Python 3.10), we can lock that configuration into Docker. Nobody will accidentally break the project by upgrading their laptop's native software. This may seem like it's not an issue, but running different versions of software very  oftern breaks projects.

### **The Two Terms We Need to Know**
1. **Docker Image**: An image is a blueprint or a read-only template. It contains the code, the operating system basics, and the configuration instructions.
2. **Docker Container**: A container is the live, running instance of that image. We can start it, stop it, test our code inside it, and delete it when we are done.


