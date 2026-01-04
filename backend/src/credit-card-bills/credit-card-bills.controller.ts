import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreditCardBillsService } from './credit-card-bills.service';
import { CreateCreditCardBillDto } from './dto/create-credit-card-bill.dto';
import { UpdateCreditCardBillDto } from './dto/update-credit-card-bill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Faturas de Cartão de Crédito')
@ApiBearerAuth()
@Controller('credit-card-bills')
@UseGuards(JwtAuthGuard)
export class CreditCardBillsController {
  constructor(private readonly creditCardBillsService: CreditCardBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova fatura de cartão de crédito' })
  @ApiResponse({ status: 201, description: 'Fatura criada com sucesso' })
  create(
    @CurrentUser() user: { id: string },
    @Body() createCreditCardBillDto: CreateCreditCardBillDto,
  ) {
    return this.creditCardBillsService.create(user.id, createCreditCardBillDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as faturas do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de faturas' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.creditCardBillsService.findAll(user.id);
  }

  @Get('current-month')
  @ApiOperation({ summary: 'Obter fatura do mês atual' })
  @ApiResponse({ status: 200, description: 'Fatura do mês atual' })
  getCurrentMonthBill(@CurrentUser() user: { id: string }) {
    return this.creditCardBillsService.getCurrentMonthBill(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter fatura por ID' })
  @ApiResponse({ status: 200, description: 'Fatura encontrada' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.creditCardBillsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fatura' })
  @ApiResponse({ status: 200, description: 'Fatura atualizada com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateCreditCardBillDto: UpdateCreditCardBillDto,
  ) {
    return this.creditCardBillsService.update(id, user.id, updateCreditCardBillDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar fatura' })
  @ApiResponse({ status: 200, description: 'Fatura deletada com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.creditCardBillsService.remove(id, user.id);
  }
}
