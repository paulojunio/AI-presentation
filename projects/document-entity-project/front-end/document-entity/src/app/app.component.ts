import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Tesseract from 'tesseract.js';
import nlp from 'compromise';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AppComponent implements OnInit {
  worker: Tesseract.Worker;
  imageSrc: string;
  @ViewChild('loadingImage', { static: false }) inputImage: ElementRef<HTMLImageElement>;


  constructor() { }

  async ngOnInit() {
    this.worker = await Tesseract.createWorker('eng');
    const text = "João bought a new house and a used cars. He also sold some antique jewelry.";
    const doc = nlp(text);
    console.log(doc.match('#Singular').text());
    console.log(doc.match('#Plural').text());
    console.log(doc.match('#Noun').text());
  }

  loadImage(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imageSrc = e.target.result;
      setTimeout(() => this.detectText(), 100);
    };
    reader.readAsDataURL(file);
  }

  private async detectText() {
    this.worker.recognize(
      this.inputImage.nativeElement,
    ).then(({ data: { text } }) => {
      console.log("Texts: ", text);
      this.detectEntities(text);
    });
  }

  private detectEntities(document: string) {
    const doc = nlp(document);
    console.log(doc.match('#Noun').out('array').map((text: any) => ({ text, label: 'Noun' })));
    console.log(doc.match('#Plural').out('array').map((text: any) => ({ text, label: 'Plural' })));
  }
}