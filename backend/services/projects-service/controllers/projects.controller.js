const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const projectsService = require('../services/projects.service');

exports.getProjects = async (req, res) => {
  try {
    const projects = await projectsService.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await projectsService.getProjectById(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения проекта' });
  }
};
