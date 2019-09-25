(() => {
  class Angles {
    constructor(height, width) {
      this.height = height;
      this.width = width;
    }
    // Getter
    get area() {
      return this.calcArea();
    }
    // Method
    calcArea() {
      return this.height * this.width;
    }
  }

  class Square extends Angles {
    constructor() {
      super(20, 20);
    }
  }
  // const mySquare = new Square();
  // console.log(mySquare.area);
})();
