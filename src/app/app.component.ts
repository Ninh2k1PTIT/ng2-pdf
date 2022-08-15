import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  getDocument,
  GlobalWorkerOptions,
  PDFDocumentProxy,
  version,
} from 'pdfjs-dist';
import { from, take, switchMap, map, Observable, forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('item') d1!: ElementRef;
  title = 'ng2pdf';
  src: string = '';
  files: any = [];
  choice: number = 0;
  totalPages: number = 0;
  pageNumber: number = 0;

  constructor() {
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
  }

  readFile(
    file: any
  ): Promise<{ name: string; data: string | ArrayBuffer | null }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve({ name: file.name, data: reader.result });
      reader.onerror = (error) => reject(error);
    });
  }

  inputFile(ev: any) {
    this.files = [];
    let observables = [];
    for (const file of ev.target.files) {
      observables.push(this.readFile(file));
    }

    let source = forkJoin(observables);
    source.subscribe((data) => {
      this.files = data;
      this.src = this.files[0].data;
    });
  }

  getPdfThumbnail(pdfUrl: any, pageNumber: number) {
    return from(getDocument(pdfUrl).promise).pipe(
      take(1),
      switchMap((pdf) => from(pdf.getPage(pageNumber))),
      switchMap((page) => {
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: 0.25 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        return from(
          page.render({
            canvasContext: canvas.getContext('2d') as CanvasRenderingContext2D,
            viewport,
          }).promise
        ).pipe(map(() => canvas));
      }),
      switchMap((canvas) => {
        return new Observable<HTMLCanvasElement>((observer) => {
          observer.next(canvas);
          observer.complete();
        });
      })
    );
  }

  afterLoadComplete(pdf: PDFDocumentProxy | any) {
    this.d1.nativeElement.innerHTML = '';
    this.totalPages = pdf.numPages;
    this.pageNumber = 1;
    let observables = [];
    for (let i = 0; i < this.totalPages; i++)
      observables.push(this.getPdfThumbnail(this.src, i + 1));
    let source = forkJoin(observables);
    source.subscribe((tags) => {
      for (let [index, value] of tags.entries()) {
        value.id = index.toString();
        value.addEventListener('click', (ev) => {
          const target = ev.target as HTMLTextAreaElement;
          this.pageNumber = parseInt(target.id) + 1;
        });
        this.d1.nativeElement.appendChild(value);
        this.d1.nativeElement.appendChild(document.createElement('br'));
      }
    });
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) this.pageNumber += 1;
  }

  previousPage() {
    if (this.pageNumber > 1) this.pageNumber -= 1;
  }

  fileChange(fileIndex: number) {
    if (this.choice != fileIndex) {
      this.choice = fileIndex;
      this.src = this.files[fileIndex].data;
    }
  }

  pageChange(pageIndex: number) {
    let item = document.getElementById(pageIndex - 1 + '');
    console.log(item);
    item?.scrollIntoView({ behavior: 'auto', block: 'center' });
  }
}
