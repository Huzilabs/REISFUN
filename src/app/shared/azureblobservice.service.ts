import { Injectable } from '@angular/core';
import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

@Injectable({
  providedIn: 'root',
})
export class Azureblobservice {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    this.initializeBlobServiceClient();
  }

  private initializeBlobServiceClient(): void {
    const sasToken = "sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-03-21T15:46:01Z&st=2025-02-21T07:46:01Z&spr=https,http&sig=uyuRnxYyH0FnGM5Bubgrqz0idNpVWaJjwLSZ6mGv7ds%3D"; // Your SAS token
    const blobServiceUrl = `https://propertyleadimages.blob.core.windows.net?${sasToken}`;  // Construct full URL with SAS token

    try {
      this.blobServiceClient = new BlobServiceClient(blobServiceUrl);
      console.log('BlobServiceClient initialized successfully');
    } catch (error) {
      console.error('Error initializing BlobServiceClient:', error);
    }
  }

  // Method to create a container if it doesn't exist
  async createContainerIfNotExists(containerName: string): Promise<void> {
    if (!this.blobServiceClient) {
      console.error('BlobServiceClient not initialized yet.');
      return;
    }

    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    try {
      const exists = await containerClient.exists();
      if (exists) {
        console.log('Container already exists');
        return;
      }
      await containerClient.create();
      console.log('Container created');
    } catch (error) {
      console.error('Error checking/creating container:', error);
      throw new Error('Failed to create container');
    }
  }

  // Method to upload a file to the 'attachments' container
  async uploadFileToAttachments(blobName: string, file: File): Promise<string> {
    const containerName = 'attachments'; // Ensure 'attachments' is used here
    if (!this.blobServiceClient) {
      console.error('BlobServiceClient not initialized yet.');
      return '';
    }

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const uploadBlobResponse = await blockBlobClient.upload(file, file.size);
      console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Method to download a file from the 'attachments' container
  async downloadFileFromAttachments(blobName: string): Promise<Blob> {
    const containerName = 'attachments'; // Ensure 'attachments' is used here
    if (!this.blobServiceClient) {
      console.error('BlobServiceClient not initialized yet.');
      return new Blob([]);
    }

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const downloadResponse = await blockBlobClient.download();
      const downloadedBlob = await downloadResponse.blobBody;
      console.log(`Downloaded blob ${blobName} successfully`);
      return downloadedBlob;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  // Method to list all blobs in the 'attachments' container
  async listBlobsInAttachments(): Promise<string[]> {
    const containerName = 'attachments'; // Ensure 'attachments' is used here
    if (!this.blobServiceClient) {
      console.error('BlobServiceClient not initialized yet.');
      return [];
    }

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobNames: string[] = [];

    try {
      for await (const blob of containerClient.listBlobsFlat()) {
        blobNames.push(blob.name);
      }
      console.log('Blob names:', blobNames);
      return blobNames;
    } catch (error) {
      console.error('Error listing blobs:', error);
      throw new Error('Failed to list blobs');
    }
  }
}
